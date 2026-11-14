import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 5176;
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
  console.log(`Responsive Test Server running at http://localhost:${PORT}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
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
    const targetsRes = await fetch('http://127.0.0.1:9225/json');
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

    // Wait for initial render
    await new Promise(r => setTimeout(r, 2000));

    async function evalCode(expression) {
      const res = await sendCommand('Runtime.evaluate', {
        expression,
        returnByValue: true
      });
      return res?.result?.value;
    }

    // Viewport test matrix
    const VIEWPORTS = [
      { name: 'Small Mobile (iPhone SE)', width: 320, height: 568, isMobile: true },
      { name: 'Narrow Mobile (Galaxy Fold cover)', width: 340, height: 720, isMobile: true },
      { name: 'Standard Mobile (Galaxy A33)', width: 360, height: 800, isMobile: true },
      { name: 'Medium Mobile (iPhone 12 mini)', width: 375, height: 812, isMobile: true },
      { name: 'Standard Mobile (iPhone 14)', width: 390, height: 844, isMobile: true },
      { name: 'Large Mobile (iPhone 14 Plus / XR)', width: 414, height: 896, isMobile: true },
      { name: 'Large Mobile (Pixel 7 / Galaxy S23)', width: 428, height: 926, isMobile: true },
      { name: 'Phablet / Small Foldable', width: 480, height: 854, isMobile: true },
      { name: 'Small Tablet (Portrait)', width: 600, height: 960, isMobile: true },
      { name: 'Tablet (iPad Portrait)', width: 768, height: 1024, isMobile: true },
      { name: 'Tablet (iPad Air Portrait)', width: 820, height: 1180, isMobile: true },
      { name: 'Tablet Landscape / Small Laptop', width: 1024, height: 768, isMobile: false },
      { name: 'iPad Pro 11" Landscape', width: 1180, height: 820, isMobile: false },
      { name: 'Standard Laptop (1280x800)', width: 1280, height: 800, isMobile: false },
      { name: 'Standard Laptop (1366x768)', width: 1366, height: 768, isMobile: false },
      { name: 'Desktop Monitor (1440x900)', width: 1440, height: 900, isMobile: false },
      { name: 'Desktop Monitor (1600x900)', width: 1600, height: 900, isMobile: false },
      { name: 'Full HD Monitor (1920x1080)', width: 1920, height: 1080, isMobile: false },
      { name: 'QHD 2K Monitor (2560x1440)', width: 2560, height: 1440, isMobile: false },
      { name: '4K Display / UHD TV (3840x2160)', width: 3840, height: 2160, isMobile: false },
      // Landscape mobile viewports
      { name: 'Mobile Landscape (Galaxy A33 800x360)', width: 800, height: 360, isMobile: true },
      { name: 'Mobile Landscape (iPhone 14 844x390)', width: 844, height: 390, isMobile: true }
    ];

    console.log(`\n📐 Testing ${VIEWPORTS.length} Viewports for Horizontal Overflow and Layout Integrity...\n`);

    const results = [];

    for (const vp of VIEWPORTS) {
      await sendCommand('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.isMobile ? 2 : 1,
        mobile: vp.isMobile
      });

      await new Promise(r => setTimeout(r, 200));

      const check = await evalCode(`(() => {
        const root = document.documentElement;
        const body = document.body;
        const scrollWidth = Math.max(root.scrollWidth, body.scrollWidth);
        const clientWidth = root.clientWidth;
        const hasHorizontalOverflow = scrollWidth > clientWidth + 1; // 1px subpixel tolerance
        
        let overflowingElements = [];
        if (hasHorizontalOverflow) {
          const all = document.querySelectorAll('*');
          for (let el of all) {
            const rect = el.getBoundingClientRect();
            if (rect.right > clientWidth + 1) {
              overflowingElements.push({
                tag: el.tagName,
                class: el.className ? String(el.className).substring(0, 40) : '',
                right: rect.right,
                width: rect.width
              });
              if (overflowingElements.length >= 3) break;
            }
          }
        }

        const navRow = document.querySelector('.minimal-navbar-row');
        const navRowRect = navRow ? navRow.getBoundingClientRect() : null;

        return {
          scrollWidth,
          clientWidth,
          hasHorizontalOverflow,
          overflowingElements,
          navRowWidth: navRowRect ? navRowRect.width : 0
        };
      })()`);

      const status = check.hasHorizontalOverflow ? '❌ OVERFLOW' : '✅ OK';
      console.log(`[${status}] ${vp.name.padEnd(38)} | Viewport: ${vp.width}x${vp.height} | Scroll: ${check.scrollWidth}px / Client: ${check.clientWidth}px`);
      if (check.hasHorizontalOverflow) {
        console.log('   🚨 Overflow culprits:', check.overflowingElements);
      }
      results.push({ viewport: vp.name, width: vp.width, height: vp.height, ...check });
    }

    const failed = results.filter(r => r.hasHorizontalOverflow);
    console.log(`\n📊 SUMMARY: ${results.length - failed.length}/${results.length} Viewports Passed.`);
    if (failed.length > 0) {
      console.log(`❌ ${failed.length} Viewports had horizontal overflow!`);
    } else {
      console.log('🎉 ZERO horizontal overflow across all tested viewports!');
    }

    cleanup(failed.length > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test run failed:', err);
    cleanup(1);
  }
});
