import hashlib
from datetime import datetime

from .polygon_service import anchor_transaction


def build_hash(payload):
    payload_bytes = payload.encode("utf-8")
    return hashlib.sha256(payload_bytes).hexdigest()


def anchor_to_polygon(transaction_id, data_hash):
    tx_hash = anchor_transaction(transaction_id, data_hash)
    timestamp = datetime.utcnow().isoformat()
    return {"tx_hash": tx_hash, "timestamp": timestamp}
