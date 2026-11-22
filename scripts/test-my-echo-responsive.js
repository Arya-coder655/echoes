import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 5182;
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
  console.log(`My Echo Responsive Test Server running at http://localhost:${PORT}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9229',
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
    const targetsRes = await fetch('http://127.0.0.1:9229/json');
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page');

    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      console.error('Could not find page target or ws URL');
      cleanup(1);
      return;
    }

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    let messageId = 1;
    const pending = new Map();

    ws.addEventListener('open', () => {
      console.log('✓ Connected to Headless Chrome CDP WebSocket');
    });

    ws.addEventListener('message', (event) => {
      const raw = typeof event.data === 'string' ? event.data : event.data.toString();
      const msg = JSON.parse(raw);
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

    // Enable Page, Runtime, DOM
    await sendCommand('Page.enable');
    await sendCommand('Runtime.enable');
    await sendCommand('DOM.enable');

    console.log('Waiting for initial application hydration...');
    await new Promise(r => setTimeout(r, 2200));

    // Click My Echo button to open dashboard
    console.log('Opening My Echo Dashboard...');
    const openRes = await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('.my-echo-hover') || document.querySelector('.mobile-tab-btn[aria-label="My Echo"]');
          if (btn) {
            btn.click();
            return { opened: true };
          }
          return { opened: false };
        })()
      `,
      returnByValue: true
    });

    console.log('Open button click result:', openRes.result?.value);
    await new Promise(r => setTimeout(r, 1500)); // wait for modal mount

    // Test matrix across all 18 viewports
    const viewports = [
      { name: 'Small mobile (iPhone SE 1st gen)', width: 320, height: 568, screenshot: 'myecho-320x568-small-mobile.png' },
      { name: 'Samsung Galaxy A33', width: 360, height: 800, screenshot: 'myecho-360x800-samsung-a33.png' },
      { name: 'iPhone 12 mini', width: 375, height: 812 },
      { name: 'iPhone 14 / Standard Mobile', width: 390, height: 844 },
      { name: 'iPhone 14 Plus / Large Mobile', width: 414, height: 896 },
      { name: 'Phablet / Foldable Inner', width: 480, height: 854 },
      { name: 'Small Tablet', width: 600, height: 960 },
      { name: 'iPad Portrait', width: 768, height: 1024, screenshot: 'myecho-768x1024-tablet.png' },
      { name: 'iPad Air Portrait', width: 820, height: 1180 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Small Laptop', width: 1280, height: 800 },
      { name: 'Standard Laptop', width: 1366, height: 768, screenshot: 'myecho-1366x768-laptop.png' },
      { name: 'Desktop Monitor', width: 1440, height: 900 },
      { name: 'Large Laptop', width: 1600, height: 900 },
      { name: 'Full HD Monitor', width: 1920, height: 1080, screenshot: 'myecho-1920x1080-desktop.png' },
      { name: '2K / QHD Display', width: 2560, height: 1440 },
      { name: '4K UHD TV / Display', width: 3840, height: 2160 },
      { name: 'Galaxy A33 Landscape', width: 800, height: 360, screenshot: 'myecho-800x360-mobile-landscape.png' }
    ];

    console.log(`\nStarting Universal Responsive Viewport Verification (${viewports.length} viewports)...\n`);

    let passedCount = 0;

    for (const vp of viewports) {
      await sendCommand('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width <= 768
      });

      await new Promise(r => setTimeout(r, 400));

      const evalResult = await sendCommand('Runtime.evaluate', {
        expression: `
          (() => {
            const modal = document.querySelector('.my-echo-window');
            const backdrop = document.querySelector('.my-echo-backdrop');
            const header = document.querySelector('.my-echo-header');
            const tabs = document.querySelectorAll('.my-echo-tab-btn');
            const body = document.querySelector('.my-echo-body');

            if (!modal) return { success: false, reason: 'Modal not in DOM' };

            const mRect = modal.getBoundingClientRect();
            const winW = window.innerWidth;
            const winH = window.innerHeight;

            const horizOverflow = document.documentElement.scrollWidth > winW + 1;
            const modalVisible = mRect.width > 0 && mRect.height > 0;
            const headerVisible = header && header.getBoundingClientRect().height > 0;
            const tabsCount = tabs ? tabs.length : 0;

            const bgStyle = window.getComputedStyle(modal);
            const isOpaque = bgStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && !bgStyle.backgroundColor.includes('0)');

            return {
              success: modalVisible && headerVisible && tabsCount >= 5 && !horizOverflow,
              modalVisible,
              headerVisible,
              tabsCount,
              horizOverflow,
              isOpaque,
              modalWidth: Math.round(mRect.width),
              modalHeight: Math.round(mRect.height),
              winW,
              winH
            };
          })()
        `,
        returnByValue: true
      });

      const metrics = evalResult.result?.value;

      if (metrics?.success) {
        passedCount++;
        console.log(`✓ [PASS] ${vp.name} (${vp.width}x${vp.height}) -> Modal: ${metrics.modalWidth}x${metrics.modalHeight}px | Tabs: ${metrics.tabsCount} | Opaque: ${metrics.isOpaque}`);
      } else {
        console.error(`✗ [FAIL] ${vp.name} (${vp.width}x${vp.height}):`, metrics);
      }

      // Take screenshot if requested
      if (vp.screenshot) {
        const shotRes = await sendCommand('Page.captureScreenshot', { format: 'png' });
        const filePath = path.join(artifactsDir, vp.screenshot);
        fs.writeFileSync(filePath, Buffer.from(shotRes.data, 'base64'));
        console.log(`  📸 Saved screenshot: ${vp.screenshot}`);
      }
    }

    console.log(`\n======================================================`);
    console.log(`Summary: ${passedCount} / ${viewports.length} Viewports Passed 100%!`);
    console.log(`======================================================\n`);

    cleanup(passedCount === viewports.length ? 0 : 1);
  } catch (err) {
    console.error('Test execution error:', err);
    cleanup(1);
  }
});
