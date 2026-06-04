"""Verify transfer integrity by comparing DB records to Storacha/local receipts."""

from __future__ import annotations

from dataclasses import dataclass, field

from django.db.models import Q
from django.utils import timezone

from supply_chain.models import BlockchainAnchor, Branch, Transfer

from .blockchain import build_hash, build_payload_signature
from .ipfs import load_receipt, normalize_receipt_access
from .record_audit import get_last_api_modification
from .polygon_service import read_chain_hash


@dataclass
class IntegrityResult:
    transfer_id: int
    status: str  # ok | mismatch | missing_receipt | missing_anchor | unchecked
    batch_code: str = ""
    farmer_name: str = ""
    branch_name: str = ""
    branch_type: str = ""
    quantity_bags: int | None = None
    stored_hash: str | None = None
    receipt_hash: str | None = None
    computed_hash: str | None = None
    chain_hash: str | None = None
    tx_hash: str | None = None
    explorer_url: str | None = None
    receipt_url: str | None = None
    receipt_storage: str = "local"
    payload_signature: str | None = None
    issues: list[str] = field(default_factory=list)
    changes: list[dict] = field(default_factory=list)
    field_comparison: dict = field(default_factory=dict)
    receipt_snapshot: dict = field(default_factory=dict)
    last_api_modification: dict | None = None
    checked_at: str = ""

    def to_dict(self) -> dict:
        return {
            "transfer_id": self.transfer_id,
            "status": self.status,
            "batch_code": self.batch_code,
            "farmer_name": self.farmer_name,
            "branch_name": self.branch_name,
            "branch_type": self.branch_type,
            "quantity_bags": self.quantity_bags,
            "stored_hash": self.stored_hash,
            "receipt_hash": self.receipt_hash,
            "computed_hash": self.computed_hash,
            "chain_hash": self.chain_hash,
            "tx_hash": self.tx_hash,
            "explorer_url": self.explorer_url,
            "receipt_url": self.receipt_url,
            "receipt_storage": self.receipt_storage,
            "payload_signature": self.payload_signature,
            "issues": self.issues,
            "changes": self.changes,
            "field_comparison": self.field_comparison,
            "receipt_snapshot": self.receipt_snapshot,
            "last_api_modification": self.last_api_modification,
            "checked_at": self.checked_at,
        }


def _receipt_integrity(receipt: dict) -> dict:
    integrity = receipt.get("integrity") or {}
    return {
        "payload_signature": integrity.get("payload_signature") or receipt.get("payload_signature"),
        "data_hash": integrity.get("data_hash") or receipt.get("data_hash"),
        "content_cid": integrity.get("content_cid") or receipt.get("content_cid"),
        "tx_hash": integrity.get("tx_hash") or receipt.get("tx_hash"),
        "network": integrity.get("network") or receipt.get("network"),
        "explorer_url": integrity.get("explorer_url") or receipt.get("explorer_url"),
    }


def _build_receipt_snapshot(receipt: dict) -> dict:
    batch = receipt.get("batch") or {}
    farmer = receipt.get("farmer") or {}
    cooperative = receipt.get("cooperative") or {}
    integrity = receipt.get("integrity") or {}
    return {
        "transfer_id": receipt.get("transfer_id"),
        "transfer_type": receipt.get("transfer_type"),
        "batch_code": batch.get("code"),
        "fertilizer_type": batch.get("fertilizer_type"),
        "quantity_bags": receipt.get("quantity_bags"),
        "farmer_name": farmer.get("name"),
        "farmer_ministry_id": farmer.get("ministry_id"),
        "farmer_phone": farmer.get("phone_number"),
        "farmer_district": farmer.get("district"),
        "cooperative_name": cooperative.get("name"),
        "cooperative_district": cooperative.get("district"),
        "cooperative_region": cooperative.get("region"),
        "supplier": receipt.get("supplier"),
        "verified_at": receipt.get("verified_at"),
        "verified_by": receipt.get("verified_by"),
        "data_hash": receipt.get("data_hash") or integrity.get("data_hash"),
        "content_cid": receipt.get("content_cid") or integrity.get("content_cid"),
        "tx_hash": receipt.get("tx_hash") or integrity.get("tx_hash"),
        "network": receipt.get("network") or integrity.get("network"),
        "payload_signature": receipt.get("payload_signature") or integrity.get("payload_signature"),
    }


def _compare_db_to_receipt(transfer: Transfer, receipt: dict) -> dict:
    receipt_batch = (receipt.get("batch") or {}).get("code")
    receipt_qty = receipt.get("quantity_bags")
    receipt_farmer = (receipt.get("farmer") or {}).get("ministry_id")
    receipt_farmer_name = (receipt.get("farmer") or {}).get("name")
    db_batch = transfer.batch.batch_code if transfer.batch else None
    db_farmer = transfer.farmer.ministry_id if transfer.farmer else None
    db_farmer_name = transfer.farmer.name if transfer.farmer else None

    return {
        "quantity_bags": {
            "database": transfer.quantity_bags,
            "receipt": receipt_qty,
            "match": transfer.quantity_bags == receipt_qty,
        },
        "batch_code": {
            "database": db_batch,
            "receipt": receipt_batch,
            "match": db_batch == receipt_batch,
        },
        "farmer_ministry_id": {
            "database": db_farmer,
            "receipt": receipt_farmer,
            "match": db_farmer == receipt_farmer,
        },
        "farmer_name": {
            "database": db_farmer_name,
            "receipt": receipt_farmer_name,
            "match": db_farmer_name == receipt_farmer_name,
        },
    }


def _build_changes(field_comparison: dict, stored_hash: str | None, receipt_hash: str | None) -> list[dict]:
    changes = []
    for field_name, row in field_comparison.items():
        if row.get("match"):
            continue
        changes.append(
            {
                "field": field_name.replace("_", " "),
                "database": row.get("database"),
                "receipt": row.get("receipt"),
            }
        )
    if stored_hash and receipt_hash and stored_hash != receipt_hash:
        changes.append(
            {
                "field": "data hash",
                "database": stored_hash,
                "receipt": receipt_hash,
            }
        )
    return changes


def _base_result_from_transfer(transfer: Transfer) -> IntegrityResult:
    branch = transfer.from_branch
    return IntegrityResult(
        transfer_id=transfer.id,
        status="unchecked",
        quantity_bags=transfer.quantity_bags,
        batch_code=transfer.batch.batch_code if transfer.batch else "",
        farmer_name=transfer.farmer.name if transfer.farmer else "",
        branch_name=branch.name if branch else "",
        branch_type=branch.branch_type if branch else "",
    )


def list_verified_transfers(
    *,
    branch_id: int | None = None,
    branch_type: str | None = None,
    search: str | None = None,
    transfer_id: int | None = None,
    limit: int = 100,
) -> list[dict]:
    """Lightweight listing — no hash verification, suitable for search UI."""
    queryset = (
        Transfer.objects.filter(
            status=Transfer.VERIFIED,
            blockchain_anchor__isnull=False,
            transfer_type=Transfer.BRANCH_TO_FARMER,
        )
        .select_related("batch", "farmer", "from_branch", "blockchain_anchor")
        .order_by("-blockchain_anchor__anchored_at", "-id")
    )

    if branch_id:
        queryset = queryset.filter(from_branch_id=branch_id)
    if branch_type in (Branch.RETAILER, Branch.COOPERATIVE):
        queryset = queryset.filter(from_branch__branch_type=branch_type)

    needle = (search or "").strip()
    if needle:
        search_filter = (
            Q(batch__batch_code__icontains=needle)
            | Q(farmer__name__icontains=needle)
            | Q(farmer__ministry_id__icontains=needle)
            | Q(from_branch__name__icontains=needle)
        )
        if needle.isdigit():
            search_filter |= Q(id=int(needle))
        queryset = queryset.filter(search_filter)

    if transfer_id:
        queryset = Transfer.objects.filter(pk=transfer_id).select_related(
            "batch", "farmer", "from_branch", "blockchain_anchor"
        )
    else:
        queryset = queryset[:limit]

    items = []
    for transfer in queryset:
        anchor = transfer.blockchain_anchor
        cid = (anchor.payload or {}).get("cid", "")
        storage_url = (anchor.payload or {}).get("storage_url") or ""
        storage_is_remote = (anchor.payload or {}).get("storage_is_remote", False)
        receipt_url, is_remote = normalize_receipt_access(
            transfer.id, cid, storage_url, storage_is_remote
        )
        branch = transfer.from_branch
        items.append(
            {
                "transfer_id": transfer.id,
                "batch_code": transfer.batch.batch_code if transfer.batch else "",
                "farmer_name": transfer.farmer.name if transfer.farmer else "",
                "branch_name": branch.name if branch else "",
                "branch_type": branch.branch_type if branch else "",
                "quantity_bags": transfer.quantity_bags,
                "stored_hash": anchor.data_hash,
                "receipt_url": receipt_url,
                "receipt_storage": "storacha" if is_remote else "local",
                "explorer_url": (
                    f"https://amoy.polygonscan.com/tx/{anchor.tx_hash}"
                    if anchor.tx_hash
                    else None
                ),
                "verified_at": anchor.anchored_at.isoformat() if anchor.anchored_at else "",
                "compare_status": "unchecked",
            }
        )
    return items


def verify_transfer_integrity(transfer: Transfer, *, check_chain: bool = False) -> IntegrityResult:
    """Compare database anchor + transfer fields against the stored receipt."""
    checked_at = timezone.now().isoformat()
    base = _base_result_from_transfer(transfer)
    base.checked_at = checked_at
    base.last_api_modification = get_last_api_modification(transfer.id)

    try:
        anchor: BlockchainAnchor = transfer.blockchain_anchor
    except BlockchainAnchor.DoesNotExist:
        base.status = "missing_anchor"
        base.issues.append("No blockchain anchor exists for this transfer.")
        return base

    base.stored_hash = anchor.data_hash
    base.tx_hash = anchor.tx_hash or None
    base.explorer_url = (
        f"https://amoy.polygonscan.com/tx/{anchor.tx_hash}" if anchor.tx_hash else None
    )

    cid = (anchor.payload or {}).get("cid", "")
    storage_url = (anchor.payload or {}).get("storage_url") or ""
    storage_is_remote = (anchor.payload or {}).get("storage_is_remote", False)
    base.receipt_url, is_remote = normalize_receipt_access(
        transfer.id, cid, storage_url, storage_is_remote
    )
    base.receipt_storage = "storacha" if is_remote else "local"

    receipt = load_receipt(transfer.id)
    if not receipt:
        base.status = "missing_receipt"
        base.issues.append("Verification receipt not found (Storacha/local).")
        return base

    receipt_meta = _receipt_integrity(receipt)
    base.receipt_hash = receipt_meta.get("data_hash")
    base.payload_signature = receipt_meta.get("payload_signature")
    base.receipt_snapshot = _build_receipt_snapshot(receipt)

    if not base.payload_signature:
        base.payload_signature = build_payload_signature(
            batch_code=(receipt.get("batch") or {}).get("code") or "",
            quantity_bags=receipt.get("quantity_bags"),
            content_cid=cid,
            transfer_id=transfer.id,
            verified_at=receipt.get("verified_at") or "",
        )

    base.computed_hash = build_hash(base.payload_signature)
    if not base.receipt_hash:
        base.receipt_hash = base.computed_hash

    base.field_comparison = _compare_db_to_receipt(transfer, receipt)
    base.changes = _build_changes(
        base.field_comparison, base.stored_hash, base.receipt_hash
    )

    if check_chain and anchor.tx_hash:
        base.chain_hash = read_chain_hash(anchor.tx_hash, str(transfer.id))

    hash_match = base.stored_hash == base.receipt_hash == base.computed_hash
    field_match = all(row.get("match", True) for row in base.field_comparison.values())

    if hash_match and field_match:
        base.status = "ok"
    else:
        base.status = "mismatch"
        if not hash_match:
            base.issues.append(
                "Database hash does not match the receipt stored on "
                f"{base.receipt_storage}."
            )
        if not field_match:
            base.issues.append("Database fields differ from the receipt snapshot.")
        for change in base.changes:
            if change["field"] == "data hash":
                continue
            base.issues.append(
                f"{change['field'].title()}: database={change['database']!r}, "
                f"receipt={change['receipt']!r}"
            )

    return base


def compare_transfers(
    transfer_ids: list[int], *, check_chain: bool = False
) -> list[IntegrityResult]:
    transfers = (
        Transfer.objects.filter(id__in=transfer_ids)
        .select_related("batch", "farmer", "from_branch", "blockchain_anchor")
        .order_by("-id")
    )
    return [verify_transfer_integrity(transfer, check_chain=check_chain) for transfer in transfers]
