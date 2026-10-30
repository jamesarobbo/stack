import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BARCODE_NOT_FOUND, OFF_ATTRIBUTION, OFF_DOSE_PROMPT } from './labels';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function source(relativePath: string): string {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

describe('Open Food Facts copy', () => {
  it('uses the ODbL line and asks for doses before saving', () => {
    expect(OFF_ATTRIBUTION).toBe('Product data from Open Food Facts, available under the ODbL');
    expect(OFF_DOSE_PROMPT).toBe('Check the doses on the label, or add any that are missing, before you save.');
    expect(BARCODE_NOT_FOUND).toContain('Open Food Facts');
    const add = source('app/add.tsx');
    const settings = source('app/settings.tsx');
    expect(add).toContain('OFF_ATTRIBUTION');
    expect(add).toContain('OFF_DOSE_PROMPT');
    expect(add).toContain("source === 'off'");
    expect(settings).toContain('OFF_ATTRIBUTION');
    expect(settings).toContain('OFF_URL');
  });
});
