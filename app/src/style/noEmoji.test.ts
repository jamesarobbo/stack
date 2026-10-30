import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(import.meta.url);
const { hasEmoji } = require(path.join(root, 'scripts', 'check-no-emoji.js')) as { hasEmoji: (text: string) => boolean };

describe('no emoji in app copy', () => {
  it('flags a pictograph and leaves ordinary punctuation alone', () => {
    expect(hasEmoji('Add supplement')).toBe(false);
    expect(hasEmoji('2 to 4')).toBe(false);
    expect(hasEmoji('score 72 out of 100')).toBe(false);
    expect(hasEmoji('home \u{1F3E0}')).toBe(true);
  });

  it('passes on the tracked app, server, and shared sources', () => {
    const script = path.join(root, 'scripts', 'check-no-emoji.js');
    expect(() => execFileSync(process.execPath, [script], { cwd: root, stdio: 'pipe' })).not.toThrow();
  });
});
