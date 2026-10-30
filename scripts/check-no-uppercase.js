#!/usr/bin/env node
/**
 * Fail if a tracked source file forces labels to uppercase.
 * Hierarchy should come from weight and size, in sentence case.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PATTERN = /textTransform\s*:\s*['"]uppercase['"]|text-transform\s*:\s*uppercase/;

const SOURCE = /\.(tsx?|jsx?|css|scss)$/;

const SKIP_PATH = [/(^|\/)node_modules\//, /(^|\/)vendor\//, /(^|\/)dist\//, /(^|\/)build\//];

function trackedFiles() {
  const out = execFileSync('git', ['ls-files', '-z'], { encoding: 'buffer' });
  return out.toString('utf8').split('\0').filter(Boolean);
}

const hits = [];
for (const file of trackedFiles()) {
  if (!SOURCE.test(file)) continue;
  if (SKIP_PATH.some((pattern) => pattern.test(file))) continue;
  const bytes = fs.readFileSync(file);
  if (bytes.includes(0)) continue;
  const text = bytes.toString('utf8');
  if (!PATTERN.test(text)) continue;
  text.split('\n').forEach((line, index) => {
    if (PATTERN.test(line)) hits.push(`${file}:${index + 1}`);
  });
}

if (hits.length > 0) {
  console.error('Source files must not set textTransform to uppercase. Use sentence case.');
  console.error(hits.join('\n'));
  process.exit(1);
}
