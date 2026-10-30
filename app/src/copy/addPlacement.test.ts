import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function source(relativePath: string): string {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

describe('where add controls live', () => {
  it('keeps the header Add and the sticky Add bar on My Stack', () => {
    const stack = source('app/(tabs)/stack.tsx');
    expect(stack).toContain('ADD_BUTTON_LABEL');
    expect(stack).toContain('ADD_SUPPLEMENT_LABEL');
    expect(stack).toContain('ADD_SUPPLEMENT_ROUTE');
  });

  it('does not put add controls on Audit, Impact, More, or the report', () => {
    for (const file of ['app/(tabs)/audit.tsx', 'app/(tabs)/impact.tsx', 'app/(tabs)/more.tsx', 'app/report.tsx']) {
      const text = source(file);
      expect(text).not.toContain('Add a supplement');
      expect(text).not.toContain('ADD_SUPPLEMENT');
      expect(text).not.toMatch(/label="Add"/);
    }
  });

  it('sends the Audit empty state back to the My Stack tab', () => {
    const audit = source('app/(tabs)/audit.tsx');
    expect(audit).toContain('GO_TO_STACK_LABEL');
    expect(audit).toContain('STACK_TAB_HREF');
    expect(audit).toContain('router.navigate(STACK_TAB_HREF)');
  });
});
