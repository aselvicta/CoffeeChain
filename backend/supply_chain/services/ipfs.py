import hashlib
import json
import logging
from dataclasses import dataclass
from pathlib import Path

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


def _ensure_url() -> str:
    if not settings.STORACHA_UPLOAD_URL:
        raise RuntimeError("STORACHA_UPLOAD_URL is not configured.")
    return settings.STORACHA_UPLOAD_URL


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
    target = _receipts_dir() / f"{safe}.json"
    target.write_bytes(content)
    cid = _local_pseudo_cid(content)
    media_url = (settings.MEDIA_URL or "media/").strip("/")
    relative = f"{media_url}/receipts/{target.name}"
    return cid, _absolute_backend_url(relative)


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
            return storage_url, False
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
    """Upload a binary file-like object to Storacha and return the CID."""
    url = _ensure_url()
    files = {"file": (getattr(file_obj, "name", "upload.bin"), file_obj)}
    response = requests.post(url, files=files, timeout=30)
    response.raise_for_status()
    payload = response.json()
    cid = payload.get("cid")
    if not cid:
        raise RuntimeError("Storacha upload failed to return a CID.")
    if not _is_remote_upload(payload, cid):
        raise RuntimeError("Storacha upload fell back to local storage for binary file.")
    return cid


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
    safe = (name or "record").strip().replace(" ", "-") or "record"
    target = _receipts_dir() / f"{safe}.json"
    target.write_bytes(content)
    media_url = (settings.MEDIA_URL or "media/").strip("/")
    return _absolute_backend_url(f"{media_url}/receipts/{target.name}")


def store_json(name: str, payload: dict) -> StorageResult:
    """Serialize a dict to JSON and persist a content-addressable receipt.

    Attempts to upload to Storacha first. If Storacha is unavailable (account
    disabled, network failure, etc.) the receipt is still written to
    ``MEDIA_ROOT/receipts/`` with a sha256-derived pseudo-CID so the rest of
    the verification flow (blockchain anchoring, audit log) can proceed and
    the data is never lost.
    """
    content = json.dumps(payload, indent=2, default=str).encode("utf-8")
    safe_name = (name or "record").strip().replace(" ", "-") or "record"

    # Try Storacha first
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

        service_url = body.get("url") or ""
        fallback_error = body.get("note") or "Storacha unavailable; saved locally."
        if not service_url:
            cid, local_url = _save_local(safe_name, content)
            return StorageResult(
                cid=cid,
                is_remote=False,
                url=local_url,
                error=fallback_error,
            )

        return StorageResult(
            cid=cid,
            is_remote=False,
            url=_absolute_backend_url(service_url),
            error=fallback_error,
        )
    except Exception as exc:
        storacha_error = str(exc)
        logger.warning(
            "Storacha upload failed for %s: %s. Falling back to local storage.",
            safe_name,
            storacha_error,
        )

    # Fallback: local content-addressed storage so the flow never breaks
    cid, local_url = _save_local(safe_name, content)
    return StorageResult(
        cid=cid,
        is_remote=False,
        url=local_url,
        error=storacha_error,
    )
