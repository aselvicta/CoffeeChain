from django.conf import settings
import requests


def store_file(file_obj):
    if not settings.STORACHA_UPLOAD_URL:
        raise RuntimeError("STORACHA_UPLOAD_URL is not configured.")

    files = {"file": (getattr(file_obj, "name", "upload.bin"), file_obj)}
    response = requests.post(settings.STORACHA_UPLOAD_URL, files=files, timeout=30)
    response.raise_for_status()
    payload = response.json()
    cid = payload.get("cid")
    if not cid:
        raise RuntimeError("Storacha upload failed to return a CID.")
    return cid
