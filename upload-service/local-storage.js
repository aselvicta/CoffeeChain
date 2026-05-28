import crypto from "crypto";
import fs from "fs";
import path from "path";

const FALLBACK_DIR =
  process.env.UPLOAD_FALLBACK_DIR ||
  path.join(process.cwd(), "..", "backend", "media", "receipts");

function ensureDir() {
  fs.mkdirSync(FALLBACK_DIR, { recursive: true });
  return FALLBACK_DIR;
}

function pseudoCid(content) {
  const digest = crypto.createHash("sha256").update(content).digest("hex");
  return `local-${digest.slice(0, 46)}`;
}

/**
 * Store file locally when Storacha rejects upload (capability disabled, etc.).
 * Returns same shape as successful Storacha upload so Django keeps working.
 */
export function storeLocalFallback(buffer, originalName) {
  const dir = ensureDir();
  const safeName = (originalName || "upload.bin").replace(/[^\w.\-]+/g, "_");
  const target = path.join(dir, safeName);
  fs.writeFileSync(target, buffer);
  const cid = pseudoCid(buffer);
  const mediaUrl = `/media/receipts/${path.basename(target)}`;
  return {
    cid,
    url: `http://localhost:8000${mediaUrl}`,
    storage: "local",
    storacha_ok: false,
    path: target,
  };
}

export function isStorachaDisabledError(error) {
  const msg = [
    error?.message,
    error?.cause?.message,
    error?.cause?.name,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    msg.includes("space/blob/add") ||
    msg.includes("capability is currently disabled") ||
    msg.includes("ServiceUnavailable")
  );
}
