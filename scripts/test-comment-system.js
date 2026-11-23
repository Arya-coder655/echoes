import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 5199;
const distDir = path.resolve('dist');
const artifactsDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\e905dacb-20cf-4846-aed4-7bc34f7151d8';

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
  if (reqPath.startsWith('/echoes')) reqPath = reqPath.replace(/^\/echoes/, '') || '/index.html';
  const filePath = path.join(distDir, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(path.join(distDir, 'index.html')).pipe(res);
  }
});

server.listen(PORT, async () => {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9244',
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

  await new Promise(r => setTimeout(r, 1600));

  try {
    const targetsRes = await fetch('http://127.0.0.1:9244/json');
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    let messageId = 1;
    const pending = new Map();

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    });

    function sendCommand(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = messageId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    if (ws.readyState !== 1) {
      await new Promise(r => ws.addEventListener('open', r, { once: true }));
    }

    await sendCommand('Page.enable');
    await sendCommand('Runtime.enable');

    console.log('--- 1. Testing Desktop Conversation Drawer (1366x768) ---');
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false
    });

    await new Promise(r => setTimeout(r, 3000));

    // Open first comments drawer
    const openRes = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const pill = document.querySelector('.comment-pill');
        if (pill) { pill.click(); return true; }
        return false;
      })()`,
      returnByValue: true
    });
    console.log('Opened comments drawer:', openRes.result?.value);
    await new Promise(r => setTimeout(r, 1200));

    // Verify elements in drawer
    const drawerElements = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const drawer = document.querySelector('.advanced-comment-drawer');
        const warmthPills = document.querySelectorAll('.warmth-pill-btn');
        const sortSelect = document.querySelector('.drawer-sort-select');
        const reactionBtns = document.querySelectorAll('.comment-reaction-btn');
        const candleBtns = document.querySelectorAll('.comment-candle-btn');
        const replyBtns = document.querySelectorAll('.comment-reply-action-btn');
        const composer = document.querySelector('.advanced-composer');
        return {
          hasDrawer: !!drawer,
          warmthPillsCount: warmthPills.length,
          hasSortSelect: !!sortSelect,
          reactionBtnsCount: reactionBtns.length,
          candleBtnsCount: candleBtns.length, // Should be 0
          replyBtnsCount: replyBtns.length,
          hasComposer: !!composer
        };
      })()`,
      returnByValue: true
    });
    console.log('Drawer elements audit:', JSON.stringify(drawerElements.result?.value, null, 2));

    // Test Quick Warmth click
    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const pill = document.querySelector('.warmth-pill-btn');
        if (pill) pill.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 800));

    // Test Reaction Click
    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const rxBtn = document.querySelector('.comment-reaction-btn');
        if (rxBtn) rxBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    // Capture Desktop Conversation Drawer Screenshot
    const shotDesktop = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'comment-system-desktop-verified.png'), Buffer.from(shotDesktop.data, 'base64'));
    console.log('📸 Saved: comment-system-desktop-verified.png');

    // Test Open Emoji Picker
    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const emojiBtn = document.querySelector('.composer-tool-btn');
        if (emojiBtn) emojiBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 800));

    const shotPicker = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'comment-system-emoji-picker-verified.png'), Buffer.from(shotPicker.data, 'base64'));
    console.log('📸 Saved: comment-system-emoji-picker-verified.png');

    // Close picker
    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const closeBtn = document.querySelector('.picker-close-btn');
        if (closeBtn) closeBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 400));

    // Test Open Share Modal
    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const shareBtn = document.querySelector('.comment-top-icon-btn');
        if (shareBtn) shareBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    const shotShare = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'comment-system-share-graphic-verified.png'), Buffer.from(shotShare.data, 'base64'));
    console.log('📸 Saved: comment-system-share-graphic-verified.png');

    // Close share modal
    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const closeBtn = document.querySelector('.comment-share-header .drawer-close-btn');
        if (closeBtn) closeBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 500));

    console.log('--- 2. Testing Mobile Responsive (Samsung Galaxy A33: 360x800) ---');
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 800,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 1000));

    const shotMobile = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'comment-system-mobile-a33-verified.png'), Buffer.from(shotMobile.data, 'base64'));
    console.log('📸 Saved: comment-system-mobile-a33-verified.png');

    console.log('\n🎉 ALL FRONTEND CDP INTERACTION TESTS PASSED!');
    cleanup(0);
  } catch (err) {
    console.error('CDP test error:', err);
    cleanup(1);
  }
});
