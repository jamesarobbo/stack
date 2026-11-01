#!/usr/bin/env node
/**
 * Fail if app source uses a font weight outside regular (400) and semibold (600).
 * font.medium and font.bold are aliases of those two and are allowed.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');

const SOURCE = /\.(tsx?|jsx?)$/;
const SKIP = [/(^|\/)node_modules\//, /(^|\/)dist\//, /(^|\/)build\//, /(^|\/)scripts\//];
const ALLOWED_TOKEN = /font\.(regular|semibold|medium|bold)/;
const LITERAL = /fontWeight\s*:\s*['"]?(100|200|300|500|700|800|900|normal|bold|lighter|bolder)['"]?|fontWeight\s*:\s*(100|200|300|500|700|800|900)\b|weight\s*=\s*['"](thin|light|medium|bold|heavy|black)['"]/i;

function tracked() {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'buffer' })
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
}

const hits = [];
for (const file of tracked()) {
  if (!file.startsWith('app/')) continue;
  if (!SOURCE.test(file)) continue;
  if (SKIP.some((p) => p.test(file))) continue;
  const bytes = fs.readFileSync(file);
  if (bytes.includes(0)) continue;
  const text = bytes.toString('utf8');
  text.split('\n').forEach((line, index) => {
    if (!/fontWeight|weight=/.test(line)) return;
    if (ALLOWED_TOKEN.test(line) && !LITERAL.test(line.replace(ALLOWED_TOKEN, 'font.regular'))) {
      // line only uses allowed tokens
      if (!/fontWeight\s*:\s*['"]?(100|200|300|500|700|800|900)/.test(line)
        && !/fontWeight\s*:\s*(100|200|300|500|700|800|900)\b/.test(line)
        && !/weight\s*=\s*['"](medium|bold)['"]/.test(line)
        && !/fontWeight\s*:\s*['"](?:normal|bold|lighter|bolder)['"]/.test(line)) {
        return;
      }
    }
    if (/fontWeight\s*:\s*['"]?400['"]?/.test(line) || /fontWeight\s*:\s*['"]?600['"]?/.test(line)) return;
    if (/fontWeight\s*:\s*400\b/.test(line) || /fontWeight\s*:\s*600\b/.test(line)) return;
    if (ALLOWED_TOKEN.test(line) && !/fontWeight\s*:\s*['"]?(100|200|300|500|700|800|900|normal|bold)/.test(line) && !/weight\s*=\s*['"](medium|bold)['"]/.test(line)) return;
    if (/weight\s*=\s*['"](regular|semibold)['"]/.test(line)) return;
    if (!/fontWeight|weight\s*=/.test(line)) return;
    // Flag disallowed literals
    if (/fontWeight\s*:\s*['"]?(100|200|300|500|700|800|900|normal|bold|lighter|bolder)['"]?/.test(line)
      || /fontWeight\s*:\s*(100|200|300|500|700|800|900)\b/.test(line)
      || /weight\s*=\s*['"](medium|bold|thin|light|heavy|black)['"]/.test(line)) {
      hits.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (hits.length > 0) {
  console.error('Only font weights 400 (regular) and 600 (semibold) are allowed.');
  console.error(hits.join('\n'));
  process.exit(1);
}
