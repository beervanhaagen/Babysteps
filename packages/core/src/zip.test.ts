import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, ZipWriter } from './zip.ts';

test('crc32 matches the standard check value, also in pieces', () => {
  const bytes = new TextEncoder().encode('123456789');
  assert.equal(crc32(bytes), 0xcbf43926);
  assert.equal(crc32(bytes.slice(4), crc32(bytes.slice(0, 4))), 0xcbf43926);
});

test('the system unzip reads what we write, names and contents intact', () => {
  const zip = new ZipWriter();
  const out: Uint8Array[] = [];
  const add = (name: string, chunks: string[]) => {
    out.push(zip.start(name));
    for (const c of chunks) {
      const bytes = new TextEncoder().encode(c);
      zip.chunk(bytes);
      out.push(bytes);
    }
    out.push(zip.end());
  };
  add('leesmij.txt', ['Lottes pad, ', 'week 1 tot 31.']);
  add('fotos/week-03_2026-03-20_1.jpg', ['\xff\xd8 nep-jpeg']);
  add('momenten.html', ['<p>Eerste keer · Zelf gezeten</p>']);
  out.push(zip.finish());
  const dir = mkdtempSync(join(tmpdir(), 'ts-zip-'));
  const file = join(dir, 'pad.zip');
  writeFileSync(file, Buffer.concat(out.map((b) => Buffer.from(b))));
  assert.match(execFileSync('unzip', ['-t', file], { encoding: 'utf8' }), /No errors detected/);
  execFileSync('unzip', ['-q', file, '-d', join(dir, 'uit')]);
  assert.equal(readFileSync(join(dir, 'uit', 'leesmij.txt'), 'utf8'), 'Lottes pad, week 1 tot 31.');
  assert.equal(readFileSync(join(dir, 'uit', 'momenten.html'), 'utf8'), '<p>Eerste keer · Zelf gezeten</p>');
});

test('refuses to grow past what a classic ZIP can hold', () => {
  const zip = new ZipWriter();
  zip.start('groot.jpg');
  // Only the length counts for the check, so a stand-in avoids allocating 4 GB.
  assert.throws(() => zip.chunk({ length: 0xffffffff } as Uint8Array), /too large/);
});
