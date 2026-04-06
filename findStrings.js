const fs = require('fs');
const path = require('path');
const text = fs.readFileSync(path.join('app','(tabs)','pets.tsx'),'utf8');
const results = [];
const regex = />\s*([^<>\n]+)\s*</g;
let match;
while (match = regex.exec(text)) {
  const snippet = match[1].trim();
  if (!snippet) continue;
  const before = text.slice(0, match.index);
  const lastTagStart = before.lastIndexOf('<');
  const lastTagEnd = before.indexOf('>', lastTagStart);
  const tag = before.slice(lastTagStart + 1, lastTagEnd).split(/\s+/)[0];
  if (!tag) continue;
  if (!tag.startsWith('Text') && !tag.startsWith('/Text')) {
    results.push({tag, snippet});
  }
}
console.log(results.slice(0, 20));
