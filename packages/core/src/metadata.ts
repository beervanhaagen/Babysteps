// Removes metadata from a photo's bytes before it leaves the phone (privacy promise: "Locatie en
// andere verborgen gegevens halen we uit elke foto voordat hij wordt opgeslagen"). iOS writes a
// small EXIF block (colour space, size) into every JPEG it encodes; a picked photo could still
// carry more. The server (supabase/functions/finish-upload) refuses anything left, as a safety net.
// Only metadata goes: the image data, quantisation tables and the colour profile (APP2/ICC) stay.

const APP1 = 0xe1; // EXIF and XMP
const APP13 = 0xed; // IPTC / Photoshop
const COM = 0xfe; // comments

/** A JPEG without APP1 (EXIF, XMP), APP13 (IPTC) and comment segments. Anything unexpected is returned as is. */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return bytes;
    const marker = bytes[i + 1];
    // Start of scan: the compressed image follows, up to the end of the file.
    if (marker === 0xda) {
      parts.push(bytes.subarray(i));
      return concat(parts);
    }
    // Markers without a length (fill bytes, restart markers, standalone).
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(bytes.subarray(i, i + 2));
      i += 2;
      continue;
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    const end = i + 2 + length;
    if (length < 2 || end > bytes.length) return bytes;
    if (marker !== APP1 && marker !== APP13 && marker !== COM) parts.push(bytes.subarray(i, end));
    i = end;
  }
  return bytes;
}

/** A WebP without EXIF and XMP chunks, with the extended header's flags and the RIFF size fixed. */
export function stripWebpMetadata(bytes: Uint8Array): Uint8Array {
  const ascii = (at: number) => String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
  if (bytes.length < 12 || ascii(0) !== 'RIFF' || ascii(8) !== 'WEBP') return bytes;
  const chunks: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= bytes.length) {
    const id = ascii(i);
    const size = bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24);
    const end = i + 8 + size + (size % 2);
    if (size < 0 || end > bytes.length) return bytes;
    if (id !== 'EXIF' && id !== 'XMP ') {
      const chunk = bytes.slice(i, end);
      // VP8X flags: bit 3 says there is EXIF, bit 2 that there is XMP.
      if (id === 'VP8X' && size >= 1) chunk[8] &= ~(0x08 | 0x04);
      chunks.push(chunk);
    }
    i = end;
  }
  const body = concat(chunks);
  const out = new Uint8Array(12 + body.length);
  out.set(bytes.subarray(0, 12));
  const riff = 4 + body.length;
  out[4] = riff & 0xff;
  out[5] = (riff >> 8) & 0xff;
  out[6] = (riff >> 16) & 0xff;
  out[7] = (riff >> 24) & 0xff;
  out.set(body, 12);
  return out;
}

/** The right one for the content type the queue uploads with. */
export function stripMetadata(bytes: Uint8Array, contentType: string): Uint8Array {
  if (contentType === 'image/jpeg') return stripJpegMetadata(bytes);
  if (contentType === 'image/webp') return stripWebpMetadata(bytes);
  return bytes;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
