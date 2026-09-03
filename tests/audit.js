/* auditoría estática: identificadores usados pero nunca declarados (ReferenceError latentes) */
const fs = require('fs'), path = require('path');
const acorn = require('acorn'), walk = require('acorn-walk');
const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const src = scripts[scripts.length - 1];
const ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', locations: true });
const declared = new Set(), used = new Map();
const BROWSER = new Set(('window document navigator location localStorage sessionStorage indexedDB console Math JSON Date Number String Array Object Promise Set Map WeakMap Symbol Error TypeError parseInt parseFloat isFinite isNaN setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame performance fetch URL Blob File FileReader Image Audio AudioContext webkitAudioContext MediaRecorder MediaStream ImageDecoder createImageBitmap ImageBitmap Float32Array Float64Array Uint8Array Uint16Array Uint32Array Int32Array Int16Array Int8Array ArrayBuffer DataView TextEncoder TextDecoder MouseEvent KeyboardEvent PointerEvent CustomEvent Event BroadcastChannel Peer FontFace prompt confirm alert atob btoa crypto screen getComputedStyle innerWidth innerHeight devicePixelRatio HTMLVideoElement HTMLCanvasElement WebGL2RenderingContext showOpenFilePicker showSaveFilePicker showDirectoryPicker structuredClone queueMicrotask undefined NaN Infinity arguments this globalThis RegExp encodeURIComponent decodeURIComponent escape unescape Intl WebSocket RTCPeerConnection MediaStreamTrack matchMedia history open close addEventListener removeEventListener dispatchEvent ResizeObserver MutationObserver IntersectionObserver DOMParser XMLSerializer Path2D OffscreenCanvas AbortController Notification getSelection scrollTo requestIdleCallback frames parent opener top self name status').split(' '));
// declaraciones
walk.full(ast, node => {
  if (node.type === 'FunctionDeclaration' && node.id) declared.add(node.id.name);
  if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') declared.add(node.id.name);
  if (node.type === 'VariableDeclarator' && node.id.type !== 'Identifier') { // destructuring
    walk.full(node.id, n2 => { if (n2.type === 'Identifier') declared.add(n2.name); });
  }
  if (node.type === 'ClassDeclaration' && node.id) declared.add(node.id.name);
  if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
    for (const p of node.params) walk.full(p, n2 => { if (n2.type === 'Identifier') declared.add(n2.name); });
  }
  if (node.type === 'CatchClause' && node.param) walk.full(node.param, n2 => { if (n2.type === 'Identifier') declared.add(n2.name); });
});
// usos: identificadores en posición de valor/llamada (no propiedades ni claves)
walk.ancestor(ast, {
  Identifier(node, ancestors) {
    const parent = ancestors[ancestors.length - 2];
    if (!parent) return;
    if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) return;
    if (parent.type === 'Property' && parent.key === node && !parent.computed && !parent.shorthand) return;
    if (parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') return;
    if (parent.type === 'LabeledStatement' || parent.type === 'BreakStatement' || parent.type === 'ContinueStatement') return;
    if ((parent.type === 'FunctionDeclaration' || parent.type === 'FunctionExpression' || parent.type === 'ClassDeclaration') && parent.id === node) return;
    if (parent.type === 'VariableDeclarator' && parent.id === node) return;
    if (parent.type === 'CatchClause' && parent.param === node) return;
    if (!used.has(node.name)) used.set(node.name, []);
    used.get(node.name).push(node.loc.start.line);
  },
});
const rotos = [];
for (const [name, lines] of used) {
  if (declared.has(name) || BROWSER.has(name)) continue;
  rotos.push({ name, lines: [...new Set(lines)].slice(0, 6) });
}
rotos.sort((a, b) => a.name.localeCompare(b.name));
console.log('funciones/variables declaradas:', declared.size, '· identificadores usados:', used.size);
console.log(rotos.length ? '❌ REFERENCIAS SIN DECLARAR: ' + rotos.length : '✅ sin referencias rotas');
for (const r of rotos) console.log('  ' + r.name + '  → líneas ' + r.lines.join(', '));
