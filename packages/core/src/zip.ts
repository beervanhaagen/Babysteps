// M6 "Alles downloaden": a plain ZIP, written piece by piece so a year of print photos (1–2 GB)
// never has to fit in memory. Files are stored, not compressed: JPEGs don't shrink anyway.
// The app streams each file's bytes through `ZipWriter` and writes what it returns to disk.
// Each part stays well under 4 GB, so the classic ZIP format (no ZIP64) is enough.

const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 as ZIP wants it; pass the previous value to continue over several chunks. */
export function crc32(bytes: Uint8Array, previous = 0): number {
  let c = (previous ^ 0xffffffff) >>> 0;
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface Entry {
  name: Uint8Array;
  crc: number;
  size: number;
  offset: number;
}

const encoder = new TextEncoder();
// The classic format counts in 32 and 16 bits: past these a ZIP silently breaks, so refuse instead.
const MAX_BYTES = 0xffffffff - 1_000_000;
const MAX_ENTRIES = 0xffff;
// 1 January 2026 in MS-DOS time; the real dates are in the names and in momenten.json.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

/**
 * Builds the bytes around the files. Use `start(name)`, then `chunk(bytes)` for the file's data
 * (write those bytes yourself), then `end()`, which returns a small data descriptor to write too.
 * `finish()` returns the central directory, the last bytes of the archive.
 */
export class ZipWriter {
  private entries: Entry[] = [];
  private written = 0;
  private current: Entry | null = null;

  /** The local header for the next file. */
  start(path: string): Uint8Array {
    if (this.current) throw new Error('Previous file not ended');
    if (this.entries.length >= MAX_ENTRIES) throw new Error('Too many files for one ZIP');
    const name = encoder.encode(path);
    this.current = { name, crc: 0, size: 0, offset: this.written };
    const header = new Uint8Array(30 + name.length);
    const v = new DataView(header.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true); // version needed
    v.setUint16(6, 0x0808, true); // sizes in the data descriptor; names in UTF-8
    v.setUint16(8, 0, true); // stored
    v.setUint16(10, DOS_TIME, true);
    v.setUint16(12, DOS_DATE, true);
    // CRC and sizes stay 0 here; they follow in the data descriptor.
    v.setUint16(26, name.length, true);
    header.set(name, 30);
    this.written += header.length;
    return header;
  }

  /** Counts a piece of the current file's data (the caller writes the bytes). */
  chunk(bytes: Uint8Array): void {
    if (!this.current) throw new Error('No file started');
    if (this.written + bytes.length > MAX_BYTES) throw new Error('ZIP too large');
    this.current.crc = crc32(bytes, this.current.crc);
    this.current.size += bytes.length;
    this.written += bytes.length;
  }

  /** Closes the current file: returns its data descriptor. */
  end(): Uint8Array {
    const entry = this.current;
    if (!entry) throw new Error('No file started');
    const descriptor = new Uint8Array(16);
    const v = new DataView(descriptor.buffer);
    v.setUint32(0, 0x08074b50, true);
    v.setUint32(4, entry.crc, true);
    v.setUint32(8, entry.size, true);
    v.setUint32(12, entry.size, true);
    this.entries.push(entry);
    this.current = null;
    this.written += descriptor.length;
    return descriptor;
  }

  /** Bytes written so far, to keep a part under its size. */
  get size(): number {
    return this.written;
  }

  /** The central directory and its end record. */
  finish(): Uint8Array {
    if (this.current) throw new Error('File not ended');
    const parts: Uint8Array[] = [];
    let length = 0;
    for (const e of this.entries) {
      const record = new Uint8Array(46 + e.name.length);
      const v = new DataView(record.buffer);
      v.setUint32(0, 0x02014b50, true);
      v.setUint16(4, 20, true); // made by
      v.setUint16(6, 20, true); // needed
      v.setUint16(8, 0x0808, true);
      v.setUint16(10, 0, true);
      v.setUint16(12, DOS_TIME, true);
      v.setUint16(14, DOS_DATE, true);
      v.setUint32(16, e.crc, true);
      v.setUint32(20, e.size, true);
      v.setUint32(24, e.size, true);
      v.setUint16(28, e.name.length, true);
      v.setUint32(42, e.offset, true);
      record.set(e.name, 46);
      parts.push(record);
      length += record.length;
    }
    const end = new Uint8Array(22);
    const v = new DataView(end.buffer);
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(8, this.entries.length, true);
    v.setUint16(10, this.entries.length, true);
    v.setUint32(12, length, true);
    v.setUint32(16, this.written, true);
    parts.push(end);
    const out = new Uint8Array(length + end.length);
    let at = 0;
    for (const p of parts) {
      out.set(p, at);
      at += p.length;
    }
    return out;
  }
}
