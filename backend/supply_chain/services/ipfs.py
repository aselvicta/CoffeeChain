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


def _save_local(name: str, content: bytes) -> tuple[str, str]:
    safe = (name or "record").strip().replace(" ", "-") or "record"
    target = _receipts_dir() / f"{safe}.json"
    target.write_bytes(content)
    cid = _local_pseudo_cid(content)
    media_url = (settings.MEDIA_URL or "/media/").rstrip("/") + "/"
    return cid, f"{media_url}receipts/{target.name}"


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
    return cid


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
        gateway = settings.IPFS_GATEWAY_URL or "https://w3s.link/ipfs/"
        return StorageResult(
            cid=cid,
            is_remote=True,
            url=f"{gateway}{cid}",
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
