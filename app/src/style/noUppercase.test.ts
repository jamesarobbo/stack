import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('sentence case', () => {
  it('fails when a tracked source file sets textTransform to uppercase', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const script = path.join(root, 'scripts', 'check-no-uppercase.js');
    expect(() => execFileSync(process.execPath, [script], { cwd: root, stdio: 'pipe' })).not.toThrow();
  });
});
