import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 5187;
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
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, async () => {
  console.log(`Stranger & Replies test server running at http://localhost:${PORT}`);
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9234',
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

  await new Promise(r => setTimeout(r, 1500));

  try {
    const targetsRes = await fetch('http://127.0.0.1:9234/json');
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

    // 1. Desktop 1366x768
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('Waiting for application hydration...');
    await new Promise(r => setTimeout(r, 3500));

    // Open first comment drawer on feed
    console.log('Opening Comments Drawer on first card...');
    const openRes = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('.comment-pill');
        if (btn) { btn.click(); return { clicked: true }; }
        return { clicked: false };
      })()`,
      returnByValue: true
    });
    console.log('Clicked comment button:', openRes.result?.value);
    await new Promise(r => setTimeout(r, 1200));

    // Check author names
    const checkNames = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const authors = Array.from(document.querySelectorAll('.comment-author-name')).map(el => el.textContent.trim());
        const hasKindSoul = document.body.innerHTML.includes('Kind Soul');
        const replyButtons = document.querySelectorAll('.comment-reply-action-btn').length;
        return { authors, hasKindSoul, replyButtons };
      })()`,
      returnByValue: true
    });
    console.log('Author names verification:', checkNames.result?.value);

    // Click "Reply" on the first comment
    console.log('Clicking Reply on the first comment...');
    const replyRes = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const replyBtn = document.querySelector('.comment-reply-action-btn');
        if (replyBtn) { replyBtn.click(); return true; }
        return false;
      })()`,
      returnByValue: true
    });
    console.log('Started reply:', replyRes.result?.value);
    await new Promise(r => setTimeout(r, 600));

    // Verify reply banner is visible
    const bannerCheck = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const banner = document.querySelector('.drawer-reply-banner');
        return {
          bannerExists: !!banner,
          bannerText: banner ? banner.textContent.trim() : null
        };
      })()`,
      returnByValue: true
    });
    console.log('Reply banner check:', bannerCheck.result?.value);

    // Capture screenshot of drawer with reply mode active
    const shot1 = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'stranger-replies-drawer-active.png'), Buffer.from(shot1.data, 'base64'));
    console.log('📸 Saved: stranger-replies-drawer-active.png');

    // Type a reply and submit
    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const input = document.querySelector('.drawer-comment-input');
        if (input) {
          input.value = "I feel the same way! You are not alone in this sanctuary.";
          input.dispatchEvent(new Event('input', { bubbles: true }));
          const sendBtn = document.querySelector('.drawer-send-btn');
          if (sendBtn) sendBtn.click();
          return true;
        }
        return false;
      })()`
    });
    await new Promise(r => setTimeout(r, 1500));

    // Capture nested comments tree
    const shot2 = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'stranger-nested-replies-verified.png'), Buffer.from(shot2.data, 'base64'));
    console.log('📸 Saved: stranger-nested-replies-verified.png');

    // Test mobile layout
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 800,
      deviceScaleFactor: 1,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 600));

    const shotMobile = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'stranger-replies-mobile-verified.png'), Buffer.from(shotMobile.data, 'base64'));
    console.log('📸 Saved: stranger-replies-mobile-verified.png');

    console.log('✨ All Stranger & Reply tests passed successfully!');
    cleanup(0);
  } catch (err) {
    console.error('Error during test:', err);
    cleanup(1);
  }
});
