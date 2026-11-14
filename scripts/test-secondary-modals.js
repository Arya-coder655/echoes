import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 5178;
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
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9227',
    '--no-sandbox',
    '--disable-gpu',
    `http://localhost:${PORT}/index.html`
  ]);

  function cleanup(code = 0) {
    try { chrome.kill(); } catch {}
    try { server.close(); } catch {}
    process.exit(code);
  }

  await new Promise(r => setTimeout(r, 1500));

  try {
    const targetsRes = await fetch('http://127.0.0.1:9227/json');
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page');
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

    const SECONDARY_MODALS = [
      {
        name: 'Zen Cinema',
        openExpr: `(() => { const b = document.querySelector('.minimal-icon-btn.cinema-hover') || document.querySelector('.hero-exp-card[data-experience="cinema"]'); if(b) b.click(); return !!b; })()`,
        dialogSelector: '.zen-cinema-fullscreen',
        closeExpr: `(() => { const b = document.querySelector('.zen-close-btn'); if(b) b.click(); return !!b; })()`
      },
      {
        name: 'Comments Drawer',
        openExpr: `(() => { const b = document.querySelector('.comment-pill') || document.querySelector('.echo-comment-btn'); if(b) b.click(); return !!b; })()`,
        dialogSelector: '.drawer-panel',
        closeExpr: `(() => { const b = document.querySelector('.drawer-close-btn'); if(b) b.click(); return !!b; })()`
      },
      {
        name: 'Share Modal',
        openExpr: `(() => { const b = document.querySelector('.share-pill') || document.querySelector('.echo-share-btn'); if(b) b.click(); return !!b; })()`,
        dialogSelector: '.share-modal-panel',
        closeExpr: `(() => { const b = document.querySelector('.share-modal-close'); if(b) b.click(); return !!b; })()`
      },
      {
        name: 'Guardian / Admin Modal',
        openExpr: `(() => { window.location.hash = '#admin'; return true; })()`,
        dialogSelector: '.admin-modal-window',
        closeExpr: `(() => { const b = document.querySelector('.admin-modal-close'); if(b) b.click(); return !!b; })()`
      }
    ];

    const TEST_VIEWPORTS = [
      { name: 'Small Mobile (320x568)', width: 320, height: 568, isMobile: true },
      { name: 'Mobile Landscape (800x360)', width: 800, height: 360, isMobile: true },
      { name: 'Tablet (768x1024)', width: 768, height: 1024, isMobile: true },
      { name: 'Laptop (1366x768)', width: 1366, height: 768, isMobile: false },
      { name: '4K Display (3840x2160)', width: 3840, height: 2160, isMobile: false }
    ];

    console.log(`\n🧪 Testing Secondary Modals (Zen Cinema, Comments, Share, Admin)...\n`);

    for (const vp of TEST_VIEWPORTS) {
      console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
      await sendCommand('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.isMobile ? 2 : 1,
        mobile: vp.isMobile
      });

      for (const modal of SECONDARY_MODALS) {
        await evalCode(modal.openExpr);
        await new Promise(r => setTimeout(r, 700));

        const stats = await evalCode(`(() => {
          const el = document.querySelector('${modal.dialogSelector}');
          if (!el) return { found: false };
          const rect = el.getBoundingClientRect();
          const winW = window.innerWidth;
          const winH = window.innerHeight;
          const overflowsX = rect.left < 0 || rect.right > winW + 1;
          const overflowsY = rect.top < 0 || rect.bottom > winH + 1;
          const isScrollableY = el.scrollHeight > el.clientHeight;
          const computed = window.getComputedStyle(el);
          const pRect = el.parentElement ? el.parentElement.getBoundingClientRect() : null;
          return {
            found: true,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right,
            transform: computed.transform,
            parentRect: pRect,
            overflowsX,
            overflowsY,
            isScrollableY,
            overflowYStyle: computed.overflowY,
            maxHeight: computed.maxHeight
          };
        })()`);

        if (!stats.found) {
          console.log(`   ⚠️ ${modal.name}: Dialog element not found!`);
        } else {
          const status = stats.overflowsX ? '❌ OVERFLOW-X' : (stats.overflowsY ? '⚠️ TALLER THAN VIEWPORT' : '✅ FITS VIEWPORT');
          console.log(`   ${status} | ${modal.name.padEnd(25)}: ${Math.round(stats.width)}x${Math.round(stats.height)}px (left: ${stats.left}, right: ${stats.right}, transform: ${stats.transform}, parentLeft: ${stats.parentRect?.left})`);
        }

        await evalCode(modal.closeExpr);
        await new Promise(r => setTimeout(r, 200));
        await evalCode(`(() => {
          window.location.hash = '';
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        })()`);
        await new Promise(r => setTimeout(r, 200));
      }
    }

    cleanup(0);
  } catch (err) {
    console.error('Secondary modal test error:', err);
    cleanup(1);
  }
});
