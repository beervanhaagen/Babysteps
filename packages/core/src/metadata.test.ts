import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripJpegMetadata, stripMetadata, stripWebpMetadata } from './metadata.ts';

const segment = (marker: number, payload: number[]) => [0xff, marker, ((payload.length + 2) >> 8) & 0xff, (payload.length + 2) & 0xff, ...payload];
const has = (bytes: Uint8Array, marker: number) => {
  for (let i = 0; i + 1 < bytes.length; i++) if (bytes[i] === 0xff && bytes[i + 1] === marker) return true;
  return false;
};

// A JPEG as iOS writes it: JFIF, a small EXIF block, an ICC profile, tables, then the image.
const app0 = segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00]);
const exif = segment(0xe1, [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 1, 2, 3, 4]);
const icc = segment(0xe2, [0x49, 0x43, 0x43, 0x5f, 9, 9]);
const iptc = segment(0xed, [0x50, 0x68, 0x6f, 0x74, 0x6f]);
const comment = segment(0xfe, [0x68, 0x69]);
const dqt = segment(0xdb, [0x00, 7, 7, 7]);
const scan = [0xff, 0xda, 0x00, 0x04, 0x01, 0x00, 0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd9];
const jpeg = new Uint8Array([0xff, 0xd8, ...app0, ...exif, ...icc, ...iptc, ...comment, ...dqt, ...scan]);

test('a JPEG loses EXIF, IPTC and comments', () => {
  const clean = stripJpegMetadata(jpeg);
  assert.equal(has(clean, 0xe1), false);
  assert.equal(has(clean, 0xed), false);
  assert.equal(has(clean, 0xfe), false);
});

test('and keeps the image, its tables and its colour profile byte for byte', () => {
  assert.deepEqual([...stripJpegMetadata(jpeg)], [0xff, 0xd8, ...app0, ...icc, ...dqt, ...scan]);
});

test('a JPEG without metadata comes back unchanged', () => {
  const plain = new Uint8Array([0xff, 0xd8, ...app0, ...dqt, ...scan]);
  assert.deepEqual([...stripJpegMetadata(plain)], [...plain]);
});

test('something that is not a JPEG is left alone', () => {
  const other = new Uint8Array([1, 2, 3, 4, 5]);
  assert.equal(stripJpegMetadata(other), other);
});

const fourcc = (s: string) => [...s].map((c) => c.charCodeAt(0));
const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
const chunk = (id: string, payload: number[]) => [...fourcc(id), ...le32(payload.length), ...payload, ...(payload.length % 2 ? [0] : [])];
const webp = (chunks: number[]) => new Uint8Array([...fourcc('RIFF'), ...le32(4 + chunks.length), ...fourcc('WEBP'), ...chunks]);

test('a WebP loses its EXIF and XMP chunks, with the header and size fixed', () => {
  const vp8x = chunk('VP8X', [0x08 | 0x04 | 0x10, 0, 0, 0, 1, 0, 0, 1, 0, 0]);
  const image = chunk('VP8L', [0x2f, 1, 2, 3, 4]);
  const clean = stripWebpMetadata(webp([...vp8x, ...image, ...chunk('EXIF', [1, 2, 3]), ...chunk('XMP ', [4, 5])]));
  const expected = webp([...chunk('VP8X', [0x10, 0, 0, 0, 1, 0, 0, 1, 0, 0]), ...image]);
  assert.deepEqual([...clean], [...expected]);
});

test('the content type picks the right one', () => {
  assert.equal(has(stripMetadata(jpeg, 'image/jpeg'), 0xe1), false);
  const odd = new Uint8Array([9, 9, 9]);
  assert.equal(stripMetadata(odd, 'image/png'), odd);
});
