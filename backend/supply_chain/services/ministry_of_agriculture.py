"""Ministry of Agriculture farmer registry source.

Single point of integration for the canonical farmer roster. Today this reads
from a local CSV at ``backend/data/farmers.csv``; in production this module
will call the Ministry of Agriculture API. Callers must depend only on the
``fetch_farmers`` / ``fetch_farmer`` functions so the swap is transparent.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Iterable

from django.conf import settings

if TYPE_CHECKING:
    from supply_chain.models import Farmer

REQUIRED_FIELDS = {"ministry_id", "name", "phone_number"}
_REGISTRY_CACHE: tuple[float, list["FarmerRecord"], dict[str, "FarmerRecord"]] | None = None


@dataclass(frozen=True)
class FarmerRecord:
    ministry_id: str
    name: str
    phone_number: str
    region: str = ""
    district: str = ""
    cooperative_name: str = ""

    def as_dict(self) -> dict:
        return {
            "ministry_id": self.ministry_id,
            "name": self.name,
            "phone_number": self.phone_number,
            "region": self.region,
            "district": self.district,
            "cooperative_name": self.cooperative_name,
        }


def _csv_path() -> Path:
    configured = getattr(settings, "FARMERS_CSV_PATH", None)
    if configured:
        return Path(configured).expanduser().resolve()
    return (Path(settings.BASE_DIR) / "data" / "farmers.csv").resolve()


def _read_csv(path: Path) -> Iterable[FarmerRecord]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or not REQUIRED_FIELDS.issubset(reader.fieldnames):
            raise ValueError(
                f"Farmer CSV {path} must include headers: {sorted(REQUIRED_FIELDS)}"
            )
        for row in reader:
            ministry_id = (row.get("ministry_id") or "").strip()
            name = (row.get("name") or "").strip()
            phone_number = (row.get("phone_number") or "").strip()
            if not ministry_id or not name or not phone_number:
                continue
            yield FarmerRecord(
                ministry_id=ministry_id,
                name=name,
                phone_number=phone_number,
                region=(row.get("region") or "").strip(),
                district=(row.get("district") or "").strip(),
                cooperative_name=(row.get("cooperative_name") or "").strip(),
            )


def _load_registry() -> tuple[list[FarmerRecord], dict[str, FarmerRecord]]:
    """Load the ministry roster, re-reading the CSV when the file changes."""

    global _REGISTRY_CACHE

    path = _csv_path()
    if not path.exists():
        raise FileNotFoundError(
            f"Farmer registry not found at {path}. "
            "Populate backend/data/farmers.csv or set FARMERS_CSV_PATH."
        )

    mtime = path.stat().st_mtime
    if _REGISTRY_CACHE and _REGISTRY_CACHE[0] == mtime:
        return _REGISTRY_CACHE[1], _REGISTRY_CACHE[2]

    records = list(_read_csv(path))
    index = {record.ministry_id: record for record in records}
    _REGISTRY_CACHE = (mtime, records, index)
    return records, index


def fetch_farmers() -> list[FarmerRecord]:
    """Return the full farmer roster from the Ministry of Agriculture source.

    Replace the body of this function with the production API client when ready.
    The return contract is stable: a list of ``FarmerRecord`` instances.
    """

    records, _ = _load_registry()
    return records


def fetch_farmer(ministry_id: str) -> FarmerRecord | None:
    """Return a single farmer by Ministry of Agriculture ID, or ``None``."""

    target = (ministry_id or "").strip()
    if not target:
        return None
    _, index = _load_registry()
    return index.get(target)


def refresh_farmer_from_registry(farmer: Farmer) -> Farmer:
    """Apply ministry registry fields to an existing local farmer row."""

    ministry_id = (getattr(farmer, "ministry_id", None) or "").strip()
    if not ministry_id or ministry_id.startswith("WALKIN-"):
        return farmer

    record = fetch_farmer(ministry_id)
    if not record:
        return farmer

    updates = {}
    for field in ("name", "phone_number", "district"):
        new_value = getattr(record, field, "")
        if getattr(farmer, field) != new_value:
            updates[field] = new_value

    if not updates:
        return farmer

    for field, value in updates.items():
        setattr(farmer, field, value)
    farmer.save(update_fields=list(updates.keys()))
    return farmer
