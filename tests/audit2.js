const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const src = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];
const lineOf = idx => src.slice(0, idx).split('\n').length;
// 1) $('#id') / getElementById('id') sin ningún id="…" en todo el archivo (HTML ni templates)
const ids = new Set([...html.matchAll(/\bid=["']?([\w-]+)/g)].map(m => m[1]));
ids.forEach(() => {});
const dynIds = new Set([...html.matchAll(/\bid="\$\{/g)]); // ids dinámicos: no auditables
const missing = new Map();
for (const m of src.matchAll(/\$\('#([\w-]+)'\)|getElementById\('([\w-]+)'\)|querySelector\('#([\w-]+)'\)/g)) {
  const id = m[1] || m[2] || m[3];
  if (!ids.has(id)) { if (!missing.has(id)) missing.set(id, []); missing.get(id).push(lineOf(m.index)); }
}
console.log('1) IDs referenciados sin ningún id="…" en el archivo:', missing.size ? '' : '✅ ninguno');
for (const [id, ls] of missing) console.log('   #' + id + ' → líneas ' + [...new Set(ls)].slice(0, 5).join(', '));
// 2) state.X leído pero nunca asignado ni declarado en el literal
const stateKeys = new Set();
for (const m of src.matchAll(/\bstate\.(\w+)\s*=[^=]/g)) stateKeys.add(m[1]);
const lit = src.slice(src.indexOf('const state = {'), src.indexOf('const state = {') + 4000);
for (const m of lit.matchAll(/^\s*(\w+):/gm)) stateKeys.add(m[1]);
const reads = new Map();
for (const m of src.matchAll(/\bstate\.(\w+)/g)) { if (!stateKeys.has(m[1])) { if (!reads.has(m[1])) reads.set(m[1], []); reads.get(m[1]).push(lineOf(m.index)); } }
console.log('2) state.X leído sin asignación conocida:', reads.size ? '' : '✅ ninguno');
for (const [k, ls] of reads) console.log('   state.' + k + ' → líneas ' + [...new Set(ls)].slice(0, 5).join(', '));
// 3) data-map="kind:..." usados en HTML/templates vs cases del switch de applyTarget
const kinds = new Set();
for (const m of html.matchAll(/data-map="([a-z]+)[:"]/g)) kinds.add(m[1]);
for (const m of src.matchAll(/dataset\.map = ['`]([a-z]+)[:'`]/g)) kinds.add(m[1]);
const at = src.slice(src.indexOf('function applyTarget('));
const cases = new Set([...at.slice(0, 12000).matchAll(/case '([a-z]+)'/g)].map(m => m[1]));
const sinHandler = [...kinds].filter(k => !cases.has(k));
console.log('3) data-map sin case en applyTarget:', sinHandler.length ? sinHandler.join(', ') : '✅ ninguno');
// 4) cases de applyTarget sin nombre legible en mapTargetName
const mt = src.slice(src.indexOf('function mapTargetName('), src.indexOf('function mapTargetName(') + 4000);
const sinNombre = [...cases].filter(k => !mt.includes("'" + k + "'"));
console.log('4) targets sin nombre en mapTargetName (se ven como id crudo en el panel MIDI):', sinNombre.length ? sinNombre.join(', ') : '✅ ninguno');
