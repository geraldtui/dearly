/**
 * Minimal multipart/form-data extractor for tests. Pulls a single named file
 * part out of a captured request body so we can assert on the uploaded audio
 * (filename, content type, and raw bytes) without a full parser dependency.
 */
export interface FilePart {
  filename: string;
  contentType: string;
  bytes: Buffer;
}

export function extractFilePart(body: Buffer, fieldName: string): FilePart | null {
  // Boundaries are ASCII; scan the body as latin1 to keep byte offsets 1:1.
  const text = body.toString("latin1");
  const marker = `name="${fieldName}"`;
  const markerIdx = text.indexOf(marker);
  if (markerIdx === -1) return null;

  const filename = /filename="([^"]*)"/.exec(text.slice(markerIdx, markerIdx + 200))?.[1] ?? "";
  const contentType =
    /Content-Type:\s*([^\r\n]+)/i.exec(text.slice(markerIdx, markerIdx + 400))?.[1]?.trim() ?? "";

  // Body starts after the blank line (\r\n\r\n) that ends this part's headers.
  const headerEnd = text.indexOf("\r\n\r\n", markerIdx);
  if (headerEnd === -1) return null;
  const bodyStart = headerEnd + 4;

  // It ends at the next boundary line (\r\n--).
  const bodyEnd = text.indexOf("\r\n--", bodyStart);
  if (bodyEnd === -1) return null;

  return {
    filename,
    contentType,
    bytes: body.subarray(bodyStart, bodyEnd),
  };
}

/** True when the bytes look like an MP3 stream (ID3 tag or a frame sync). */
export function looksLikeMp3(bytes: Buffer): boolean {
  if (bytes.length < 2) return false;
  if (bytes.toString("ascii", 0, 3) === "ID3") return true;
  return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
}
