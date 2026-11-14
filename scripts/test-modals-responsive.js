import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 5177;
const distDir = path.resolve('dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath.startsWith('/echoes')) {
    reqPath = reqPath.replace(/^\/echoes/, '') || '/index.html';
  }

  const filePath = path.join(distDir, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found: ' + reqPath);
  }
});

server.listen(PORT, async () => {
  console.log(`Modal Responsive Test Server running at http://localhost:${PORT}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--no-sandbox',
    '--disable-gpu',
    `http://localhost:${PORT}/index.html`
  ]);

  let isCleanedUp = false;
  function cleanup(code = 0) {
    if (isCleanedUp) return;
    isCleanedUp = true;
    try { chrome.kill(); } catch {}
    try { server.close(); } catch {}
    process.exit(code);
  }

  process.on('SIGINT', () => cleanup(0));
  process.on('SIGTERM', () => cleanup(0));

  await new Promise(r => setTimeout(r, 1500));

  try {
    const targetsRes = await fetch('http://127.0.0.1:9226/json');
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page');

    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      console.error('Could not find page target or ws URL');
      cleanup(1);
      return;
    }

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    let idCounter = 1;
    const pendingCallbacks = new Map();

    function sendCommand(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = idCounter++;
        pendingCallbacks.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    ws.addEventListener('open', async () => {
      await sendCommand('Runtime.enable');
      await sendCommand('DOM.enable');
    });

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.id && pendingCallbacks.has(msg.id)) {
        const cb = pendingCallbacks.get(msg.id);
        pendingCallbacks.delete(msg.id);
        cb(msg.result);
      }
    });

    await new Promise(r => setTimeout(r, 2000));

    async function evalCode(expression) {
      const res = await sendCommand('Runtime.evaluate', {
        expression,
        returnByValue: true
      });
      return res?.result?.value;
    }

    // Modals to test
    const MODALS = [
      {
        name: 'Echo Composer',
        openExpr: `(() => { const b = document.querySelector('.minimal-cta-btn') || document.querySelector('.quick-compose-trigger'); if(b) b.click(); return !!b; })()`,
        dialogSelector: '.composer-modal-window',
        closeExpr: `(() => { const b = document.querySelector('.composer-close-btn'); if(b) b.click(); return !!b; })()`
      },
      {
        name: 'Soundscape Mixer (Rain Sanctuary)',
        openExpr: `(() => { const b = document.querySelector('.minimal-icon-btn.audio-hover') || document.querySelector('.hero-exp-card[data-experience="mixer"]'); if(b) b.click(); return !!b; })()`,
        dialogSelector: '.mixer-modal-panel',
        closeExpr: `(() => { const b = document.querySelector('.mixer-close-btn'); if(b) b.click(); return !!b; })()`
      },
      {
        name: 'The Sacred Hearth (Catharsis Ritual)',
        openExpr: `(() => { const b = document.querySelector('.minimal-icon-btn.flame-hover') || document.querySelector('.hero-exp-card[data-experience="ritual"]'); if(b) b.click(); return !!b; })()`,
        dialogSelector: '.ritual-modal-panel',
        closeExpr: `(() => { const b = document.querySelector('.ritual-close-btn'); if(b) b.click(); return !!b; })()`
      },
      {
        name: 'About Sanctuary',
        openExpr: `(() => { const b = document.querySelector('.footer-about-pill-btn') || document.querySelector('.footer-about-btn'); if(b) b.click(); return !!b; })()`,
        dialogSelector: '.about-modal-panel',
        closeExpr: `(() => { const b = document.querySelector('.about-close-btn'); if(b) b.click(); return !!b; })()`
      },
      {
        name: 'Beer Support',
        openExpr: `(() => { const b = document.querySelector('.header-beer-btn') || document.querySelector('.footer-beer-btn'); if(b) b.click(); return !!b; })()`,
        dialogSelector: '.beer-modal-card',
        closeExpr: `(() => { const b = document.querySelector('.beer-modal-close-btn'); if(b) b.click(); return !!b; })()`
      }
    ];

    const TEST_VIEWPORTS = [
      { name: 'Small Mobile (320x568)', width: 320, height: 568, isMobile: true },
      { name: 'Samsung A33 (360x800)', width: 360, height: 800, isMobile: true },
      { name: 'Mobile Landscape (800x360)', width: 800, height: 360, isMobile: true },
      { name: 'Laptop (1366x768)', width: 1366, height: 768, isMobile: false },
      { name: '4K Display (3840x2160)', width: 3840, height: 2160, isMobile: false }
    ];

    console.log(`\n🧪 Testing Modals Across Responsive Viewports...\n`);

    for (const vp of TEST_VIEWPORTS) {
      console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      await sendCommand('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.isMobile ? 2 : 1,
        mobile: vp.isMobile
      });

      for (const modal of MODALS) {
        // Open modal
        await evalCode(modal.openExpr);
        await new Promise(r => setTimeout(r, 400));

        const modalStats = await evalCode(`(() => {
          const el = document.querySelector('${modal.dialogSelector}');
          if (!el) return { found: false };
          const rect = el.getBoundingClientRect();
          const winW = window.innerWidth;
          const winH = window.innerHeight;
          const overflowsX = rect.left < 0 || rect.right > winW + 1;
          const overflowsY = rect.top < 0 || rect.bottom > winH + 1;
          const isScrollableY = el.scrollHeight > el.clientHeight;
          const computed = window.getComputedStyle(el);
          return {
            found: true,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right,
            overflowsX,
            overflowsY,
            isScrollableY,
            overflowYStyle: computed.overflowY,
            maxHeight: computed.maxHeight
          };
        })()`);

        if (!modalStats.found) {
          console.log(`   ⚠️ ${modal.name}: Dialog element not found!`);
        } else {
          const status = modalStats.overflowsX ? '❌ OVERFLOW-X' : (modalStats.overflowsY ? '⚠️ TALLER THAN VIEWPORT' : '✅ FITS VIEWPORT');
          console.log(`   ${status} | ${modal.name.padEnd(35)}: ${Math.round(modalStats.width)}x${Math.round(modalStats.height)}px (maxH: ${modalStats.maxHeight}, overflowY: ${modalStats.overflowYStyle}, scrollable: ${modalStats.isScrollableY})`);
        }

        // Close modal
        await evalCode(modal.closeExpr);
        await new Promise(r => setTimeout(r, 300));
        // Fallback ESC key
        await evalCode(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));`);
        await new Promise(r => setTimeout(r, 200));
      }
    }

    cleanup(0);
  } catch (err) {
    console.error('Modal responsive test error:', err);
    cleanup(1);
  }
});
