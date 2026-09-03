/* Mide cuántas subidas de textura (texImage2D) y cuántos ms de JS cuesta un frame
   con TODOS los overlays activos (estructuras + partículas + pintura + logo + foco + público). */
const path = require('path');
const { chromium } = require('playwright-core');
const APP = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch({ ...(ch ? { channel: ch } : {}), headless: true, args: ['--mute-audio'] }); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.addInitScript(() => {
    try { const u = JSON.parse(localStorage.getItem('ravenvj_ui') || '{}'); u.welcomed = true; u.lang = 'es'; localStorage.setItem('ravenvj_ui', JSON.stringify(u)); localStorage.removeItem('ravenvj_autosave'); } catch (e) { }
    // contar subidas de textura por frame
    const orig = WebGL2RenderingContext.prototype.texImage2D;
    window.__tex = 0;
    WebGL2RenderingContext.prototype.texImage2D = function () { window.__tex++; return orig.apply(this, arguments); };
  });
  await page.goto(APP);
  await page.waitForTimeout(1800);
  const r = await page.evaluate(async () => {
    assignPreset(state.grid[0][0], 2); state.fade = 0; triggerCell(0, 0);
    state.structs = [{ pts: [[.1, .5], [.9, .5]], closed: false, fx: 'chase', color: 'cycle', beats: 2, width: 6, react: 'off', on: true },
      { pts: [[.2, .2], [.8, .2], [.8, .8], [.2, .8]], closed: true, fx: 'pulse', color: 'cycle', beats: 2, width: 6, react: 'off', on: true }];
    state.party = 'nieve';
    if (typeof partyBurst === 'function') partyBurst(80);
    const cv = document.createElement('canvas'); cv.width = 8; cv.height = 8; cv.getContext('2d').fillStyle = '#f00'; cv.getContext('2d').fillRect(0, 0, 8, 8);
    state.logo = { on: true, src: cv.toDataURL(), pos: 'br', op: .9, sc: .16, beat: true };
    if (state.spot) state.spot.on = true;
    if (typeof paint !== 'undefined') { paint.on = true; paint.strokes.push({ pts: [[.1, .1], [.5, .5], [.9, .2]], born: performance.now() + 1e9, col: '#0f0' }); }
    pub.on = true; for (let i = 0; i < 12; i++) pubSpawn('🔥');
    await new Promise(res => setTimeout(res, 600));
    window.__tex = 0;
    const t0 = performance.now();
    let frames = 0;
    await new Promise(res => { const f = () => { frames++; if (frames < 90) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    const secs = (performance.now() - t0) / 1000;
    return { texPorFrame: +(window.__tex / frames).toFixed(2), fps: Math.round(frames / secs), jsMs: typeof cost !== 'undefined' ? +cost.js.toFixed(2) : null };
  });
  console.log(JSON.stringify(r));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
