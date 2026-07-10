import hashlib
import json
import logging
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

from django.conf import settings
import requests


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class StorageResult:
    """Outcome of an attempt to record a receipt on Storacha (IPFS)."""

    cid: str
    is_remote: bool
    url: str
    error: str | None = None


def _storacha_enabled() -> bool:
    enabled = getattr(settings, "STORACHA_UPLOAD_ENABLED", True)
    url = (getattr(settings, "STORACHA_UPLOAD_URL", "") or "").strip()
    return bool(enabled and url)


def _ensure_url() -> str:
    url = (getattr(settings, "STORACHA_UPLOAD_URL", "") or "").strip()
    if not url:
        raise RuntimeError("STORACHA_UPLOAD_URL is not configured.")
    return url


def _receipts_dir() -> Path:
    base = Path(getattr(settings, "MEDIA_ROOT", Path("media"))) / "receipts"
    base.mkdir(parents=True, exist_ok=True)
    return base


def _local_pseudo_cid(content: bytes) -> str:
    digest = hashlib.sha256(content).hexdigest()
    return f"local-{digest[:46]}"


def _is_local_cid(cid: str) -> bool:
    return (cid or "").startswith("local-")


def _absolute_backend_url(relative_path: str) -> str:
    """Build a browser-openable URL for files served by Django MEDIA."""
    if relative_path.startswith(("http://", "https://")):
        parsed = urlparse(relative_path)
        host = (parsed.hostname or "").lower()
        if host in {"localhost", "127.0.0.1"}:
            path = parsed.path.lstrip("/")
            base = getattr(settings, "BACKEND_PUBLIC_URL", "http://127.0.0.1:8000").rstrip("/")
            return f"{base}/{path}"
        return relative_path
    base = getattr(settings, "BACKEND_PUBLIC_URL", "http://127.0.0.1:8000").rstrip("/")
    path = relative_path.lstrip("/")
    return f"{base}/{path}"


def _is_remote_upload(body: dict, cid: str) -> bool:
    if _is_local_cid(cid):
        return False
    if body.get("storage") == "local":
        return False
    if body.get("storacha_ok") is False:
        return False
    return True


def _save_local(name: str, content: bytes) -> tuple[str, str]:
    safe = (name or "record").strip().replace(" ", "-") or "record"
    if not safe.endswith(".json"):
        safe = f"{safe}.json"
    target = _receipts_dir() / safe
    target.write_bytes(content)
    cid = _local_pseudo_cid(content)
    media_url = (settings.MEDIA_URL or "media/").strip("/")
    relative = f"{media_url}/receipts/{target.name}"
    return cid, _absolute_backend_url(relative)


def _local_storage_result(name: str, content: bytes, error: str | None = None) -> StorageResult:
    cid, local_url = _save_local(name, content)
    return StorageResult(
        cid=cid,
        is_remote=False,
        url=local_url,
        error=error or "Storacha unavailable; receipt saved on backend.",
    )


def normalize_receipt_access(
    transfer_id: int,
    cid: str,
    storage_url: str,
    is_remote: bool,
) -> tuple[str, bool]:
    """Ensure receipt links open correctly (fix legacy local- CID → IPFS URLs)."""
    receipt_file = f"transfer-{transfer_id}-receipt.json"
    if _is_local_cid(cid) or not is_remote:
        if (
            storage_url
            and storage_url.startswith(("http://", "https://"))
            and "/ipfs/local-" not in storage_url
        ):
            fixed_url = _absolute_backend_url(storage_url)
            host = urlparse(fixed_url).hostname or ""
            if host not in {"localhost", "127.0.0.1"}:
                return fixed_url, False
        if (_receipts_dir() / receipt_file).exists():
            return _absolute_backend_url(f"media/receipts/{receipt_file}"), False
        if storage_url:
            return _absolute_backend_url(storage_url), False
        return _absolute_backend_url(f"media/receipts/{receipt_file}"), False

    if cid and (not storage_url or "/ipfs/local-" in storage_url):
        gateway = (settings.IPFS_GATEWAY_URL or "https://w3s.link/ipfs/").rstrip("/") + "/"
        return f"{gateway}{cid}", True
    return storage_url, bool(is_remote)


def store_file(file_obj):
    """Upload a binary file-like object to Storacha, or return a local pseudo-CID."""
    name = getattr(file_obj, "name", "upload.bin")
    content = b""
    if hasattr(file_obj, "read"):
        content = file_obj.read()
        if hasattr(file_obj, "seek"):
            file_obj.seek(0)

    if _storacha_enabled():
        try:
            url = _ensure_url()
            files = {"file": (name, content, getattr(file_obj, "content_type", None) or "application/octet-stream")}
            response = requests.post(url, files=files, timeout=30)
            response.raise_for_status()
            payload = response.json()
            cid = payload.get("cid")
            if cid and _is_remote_upload(payload, cid):
                return cid
            logger.warning(
                "Storacha binary upload unavailable for %s; using local pseudo-CID.",
                name,
            )
        except Exception as exc:
            logger.warning(
                "Storacha binary upload failed for %s: %s. Using local pseudo-CID.",
                name,
                exc,
            )

    return _local_pseudo_cid(content)


def receipt_file_path(transfer_id: int) -> Path:
    return _receipts_dir() / f"transfer-{transfer_id}-receipt.json"


def load_receipt(transfer_id: int) -> dict | None:
    """Load a verification receipt from local storage."""
    target = receipt_file_path(transfer_id)
    if not target.exists():
        return None
    try:
        return json.loads(target.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Could not read receipt for transfer %s: %s", transfer_id, exc)
        return None


def save_receipt_local(name: str, payload: dict) -> str:
    """Overwrite a receipt JSON file on disk (used after integrity metadata is added)."""
    content = json.dumps(payload, indent=2, default=str).encode("utf-8")
    _, local_url = _save_local(name, content)
    return local_url


def save_receipt_bytes(name: str, content: bytes) -> StorageResult:
    """Persist raw receipt bytes on the Django backend (internal callback)."""
    return _local_storage_result(name, content, error="Saved via backend receipt callback.")


def store_json(name: str, payload: dict) -> StorageResult:
    """Serialize a dict to JSON and persist a content-addressable receipt.

    Attempts Storacha when enabled. Otherwise — or on any failure — the receipt
    is written to ``MEDIA_ROOT/receipts/`` on the Django backend so integrity
    checks and anchoring still work in production without Storacha.
    """
    content = json.dumps(payload, indent=2, default=str).encode("utf-8")
    safe_name = (name or "record").strip().replace(" ", "-") or "record"

    if not _storacha_enabled():
        return _local_storage_result(
            safe_name,
            content,
            error="Storacha upload disabled; receipt saved on backend.",
        )

    storacha_error: str | None = None
    try:
        url = _ensure_url()
        files = {"file": (f"{safe_name}.json", content, "application/json")}
        response = requests.post(url, files=files, timeout=30)
        response.raise_for_status()
        body = response.json()
        cid = body.get("cid")
        if not cid:
            raise RuntimeError("Storacha JSON upload returned no CID.")

        if _is_remote_upload(body, cid):
            gateway = (settings.IPFS_GATEWAY_URL or "https://w3s.link/ipfs/").rstrip("/") + "/"
            return StorageResult(
                cid=cid,
                is_remote=True,
                url=f"{gateway}{cid}",
            )

        fallback_error = body.get("note") or "Storacha unavailable; saved on backend."
        return _local_storage_result(safe_name, content, error=fallback_error)
    except Exception as exc:
        storacha_error = str(exc)
        logger.warning(
            "Storacha upload failed for %s: %s. Falling back to backend storage.",
            safe_name,
            storacha_error,
        )

    return _local_storage_result(safe_name, content, error=storacha_error)
