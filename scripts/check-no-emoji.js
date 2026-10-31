#!/usr/bin/env node
/**
 * Fail if app copy contains an emoji pictograph.
 * Scans tracked source under app/, server/src/, and shared/.
 * The pattern is a unicode property, so this file contains no emoji.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PICTOGRAPH = /\p{Extended_Pictographic}/u;

const COPY_PATH = /^(app|server\/src|shared)\//;
const SOURCE = /\.(tsx?|jsx?|css|html)$/;

function hasEmoji(text) {
  return PICTOGRAPH.test(text);
}

function trackedFiles() {
  const out = execFileSync('git', ['ls-files', '-z'], { encoding: 'buffer' });
  return out.toString('utf8').split('\0').filter(Boolean);
}

function main() {
  const hits = [];
  for (const file of trackedFiles()) {
    if (!COPY_PATH.test(file) || !SOURCE.test(file)) continue;
    if (file.includes('node_modules/')) continue;
    const bytes = fs.readFileSync(file);
    if (bytes.includes(0)) continue;
    const text = bytes.toString('utf8');
    if (!hasEmoji(text)) continue;
    text.split('\n').forEach((line, index) => {
      if (hasEmoji(line)) hits.push(`${file}:${index + 1}`);
    });
  }

  if (hits.length > 0) {
    console.error('App copy must not contain emoji. Remove the pictograph and write the word.');
    console.error(hits.join('\n'));
    process.exit(1);
  }
}

module.exports = { hasEmoji };

if (require.main === module) main();
