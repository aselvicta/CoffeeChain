/**
 * When Storacha is down, POST the file to the Django backend so receipts
 * land in MEDIA_ROOT/receipts/ and the anchor DB copy (same fallback as localhost).
 */
function resolveCallbackUrl() {
  const explicit = (process.env.BACKEND_RECEIPT_CALLBACK_URL || "").trim();
  if (explicit) return explicit;
  const host = (
    process.env.BACKEND_API_HOST ||
    process.env.BACKEND_PUBLIC_URL ||
    ""
  ).trim();
  if (!host) return "";
  const base = host.startsWith("http") ? host.replace(/\/$/, "") : `https://${host.replace(/\/$/, "")}`;
  return `${base}/api/internal/receipt-callback/`;
}

export async function postReceiptToBackend(buffer, originalName) {
  const url = resolveCallbackUrl();
  const secret = (process.env.RECEIPT_CALLBACK_SECRET || "").trim();
  if (!url || !secret) {
    return null;
  }

  const form = new FormData();
  const blob = new Blob([buffer], {
    type: originalName.endsWith(".json") ? "application/json" : "application/octet-stream",
  });
  form.append("file", blob, originalName);
  form.append("name", originalName);

  const response = await fetch(url, {
    method: "POST",
    headers: { "X-Receipt-Callback-Token": secret },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Backend receipt callback failed (${response.status}): ${text}`);
  }

  return response.json();
}
