// PurchaseOrder.id was migrated in as the literal historical PO number (e.g.
// "ZSPL/PO/P/A/26-27/202") rather than a minted cuid, so it contains "/" — which a
// Next.js dynamic route segment can't carry even URL-encoded (a raw "%2F" in a path
// segment 404s rather than decoding back to "/"). These helpers swap the slash for a
// separator that's safe in a single path segment; only used at the URL boundary, the
// stored id/poNumber themselves are untouched.
export function encodeIdForUrl(id: string) {
  return id.replaceAll("/", "~");
}

export function decodeIdFromUrl(id: string) {
  return id.replaceAll("~", "/");
}
