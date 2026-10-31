import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function source(relativePath: string): string {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

describe('where add controls live', () => {
  it('keeps a single Add supplement bar on My Stack', () => {
    const stack = source('app/(tabs)/stack.tsx');
    expect(stack).toContain('ADD_SUPPLEMENT_LABEL');
    expect(stack).toContain('ADD_SUPPLEMENT_ROUTE');
    expect(stack).not.toContain('Add a supplement');
    expect(stack).not.toContain('ADD_BUTTON_LABEL');
    expect(stack).not.toContain('<Button');
    expect(stack.match(/router\.push\(ADD_SUPPLEMENT_ROUTE\)/g)).toHaveLength(1);
    expect(stack).toContain("router.push('/scan')");
    expect(stack).toContain('barcode-outline');
    expect(stack).toContain('Scan a barcode');
  });

  it('does not repeat the tab name in a header eyebrow', () => {
    for (const file of ['app/(tabs)/stack.tsx', 'app/(tabs)/discover.tsx', 'app/(tabs)/audit.tsx', 'app/(tabs)/impact.tsx', 'app/(tabs)/more.tsx']) {
      expect(source(file)).not.toContain('<Eyebrow');
    }
    expect(source('app/report.tsx')).toContain('MONTHLY_REPORT_LABEL');
    expect(source('app/settings.tsx')).toContain('Settings');
  });

  it('does not put add controls on Discover, Audit, Impact, More, or the report', () => {
    for (const file of ['app/(tabs)/discover.tsx', 'app/(tabs)/audit.tsx', 'app/(tabs)/impact.tsx', 'app/(tabs)/more.tsx', 'app/report.tsx']) {
      const text = source(file);
      expect(text).not.toContain('Add a supplement');
      expect(text).not.toContain('ADD_SUPPLEMENT');
      expect(text).not.toMatch(/label="Add"/);
    }
  });

  it('keeps Discover as the second tab, without a page title or a My Stack link', () => {
    const layout = source('app/(tabs)/_layout.tsx');
    const names = ['name="stack"', 'name="discover"', 'name="audit"', 'name="impact"', 'name="more"'];
    let at = -1;
    for (const name of names) {
      const next = layout.indexOf(name);
      expect(next).toBeGreaterThan(at);
      at = next;
    }
    expect(layout).toContain('compass-outline');
    expect(layout).not.toContain('home-outline');
    expect(layout).not.toContain('name="home"');
    const discover = source('app/(tabs)/discover.tsx');
    expect(discover).not.toContain('<BackButton');
    expect(discover).not.toContain('DISCOVER_LABEL');
    expect(discover).toContain('DISCOVER_EMPTY_TITLE');
    expect(discover).toContain('DISCOVER_SPARSE');
    expect(discover).toContain('items.length < 3');
    expect(source('app/(tabs)/stack.tsx')).not.toContain('/discover');
    expect(source('app/_layout.tsx')).not.toContain('name="discover"');
    expect(source('app/(tabs)/audit.tsx')).toContain('BROWSE_LISTED');
    expect(source('app/(tabs)/audit.tsx')).toContain('DISCOVER_TAB_HREF');
    expect(source('app/paywall.tsx')).toContain('BROWSE_LISTED');
    expect(source('app/paywall.tsx')).toContain('browseListed');
  });

  it('sends the Audit empty state back to the My Stack tab', () => {
    const audit = source('app/(tabs)/audit.tsx');
    expect(audit).toContain('GO_TO_STACK_LABEL');
    expect(audit).toContain('STACK_TAB_HREF');
    expect(audit).toContain('router.navigate(STACK_TAB_HREF)');
  });
});
