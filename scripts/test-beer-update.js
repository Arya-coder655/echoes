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
  console.log(`Beer Update Verification Server running at http://localhost:${PORT}`);
  
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9229',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1280,800',
    `http://localhost:${PORT}/index.html`
  ]);

  await new Promise(r => setTimeout(r, 1500));

  function cleanup(code = 0) {
    try { chrome.kill(); } catch (e) {}
    server.close();
    process.exit(code);
  }

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
    let idCounter = 1;
    const pendingCallbacks = new Map();

    function sendCommand(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = idCounter++;
        pendingCallbacks.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pendingCallbacks.has(data.id)) {
        const resolve = pendingCallbacks.get(data.id);
        pendingCallbacks.delete(data.id);
        resolve(data.result);
      }
    });

    async function evalScript(expression) {
      const res = await sendCommand('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res?.result?.value;
    }

    async function takeScreenshot(filePath) {
      const res = await sendCommand('Page.captureScreenshot', { format: 'png' });
      if (res && res.data) {
        fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
      }
    }

    ws.addEventListener('open', async () => {
      await sendCommand('Runtime.enable');
      await sendCommand('Page.enable');

      // Wait for splash screen to complete fade-out (minDuration is 1200ms + 500ms fade)
      await new Promise(r => setTimeout(r, 2200));

      console.log('🍺 1. Checking header beer emoji button outside of navbar...');
      const headerBeerBtn = await evalScript(`
        (function() {
          const btn = document.querySelector('.header-beer-btn');
          const navbar = document.querySelector('.minimal-navbar');
          const isOutside = btn && navbar && !navbar.contains(btn);
          return {
            hasBtn: !!btn,
            isOutsideNavbar: isOutside,
            text: btn ? btn.innerText.trim() : null
          };
        })()
      `);
      console.log('Header beer button inspection:', headerBeerBtn);

      if (!headerBeerBtn.hasBtn || !headerBeerBtn.isOutsideNavbar) {
        console.error('❌ Header beer button not found or not outside navbar!');
        cleanup(1);
        return;
      }

      const artifactDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\e905dacb-20cf-4846-aed4-7bc34f7151d8';
      await takeScreenshot(path.join(artifactDir, 'beer-01-header-btn.png'));
      console.log('📸 Captured beer-01-header-btn.png');

      console.log('🍺 2. Clicking header beer button to open modal...');
      await evalScript(`
        (function() {
          const btn = document.querySelector('.header-beer-btn');
          if (btn) btn.click();
        })()
      `);

      await new Promise(r => setTimeout(r, 1200));

      console.log('🍺 3. Inspecting Beer Modal price tiers (90rs, 150rs, 250rs)...');
      const modalInspection = await evalScript(`
        (function() {
          const pills = Array.from(document.querySelectorAll('.beer-amount-pill')).map(p => p.innerText.trim());
          const activePill = document.querySelector('.beer-amount-pill.active')?.innerText.trim();
          const qrCaption = document.querySelector('.beer-qr-caption')?.innerText.trim();
          return {
            pills,
            activePill,
            qrCaption
          };
        })()
      `);
      console.log('Beer modal tiers inspection:', modalInspection);

      await takeScreenshot(path.join(artifactDir, 'beer-02-modal-150-default.png'));
      console.log('📸 Captured beer-02-modal-150-default.png');

      // Click 90rs
      console.log('🍺 4. Clicking ₹90 tier...');
      await evalScript(`
        (function() {
          const btn90 = Array.from(document.querySelectorAll('.beer-amount-pill')).find(p => p.innerText.includes('90'));
          if (btn90) btn90.click();
        })()
      `);
      await new Promise(r => setTimeout(r, 300));

      const after90 = await evalScript(`
        (function() {
          const activePill = document.querySelector('.beer-amount-pill.active')?.innerText.trim();
          const qrCaption = document.querySelector('.beer-qr-caption')?.innerText.trim();
          return { activePill, qrCaption };
        })()
      `);
      console.log('After clicking 90:', after90);
      await takeScreenshot(path.join(artifactDir, 'beer-03-modal-90.png'));
      console.log('📸 Captured beer-03-modal-90.png');

      // Click 250rs
      console.log('🍺 5. Clicking ₹250 tier...');
      await evalScript(`
        (function() {
          const btn250 = Array.from(document.querySelectorAll('.beer-amount-pill')).find(p => p.innerText.includes('250'));
          if (btn250) btn250.click();
        })()
      `);
      await new Promise(r => setTimeout(r, 300));

      const after250 = await evalScript(`
        (function() {
          const activePill = document.querySelector('.beer-amount-pill.active')?.innerText.trim();
          const qrCaption = document.querySelector('.beer-qr-caption')?.innerText.trim();
          return { activePill, qrCaption };
        })()
      `);
      console.log('After clicking 250:', after250);
      await takeScreenshot(path.join(artifactDir, 'beer-04-modal-250.png'));
      console.log('📸 Captured beer-04-modal-250.png');

      // Close modal
      await evalScript(`
        (function() {
          const closeBtn = document.querySelector('.beer-modal-close-btn');
          if (closeBtn) closeBtn.click();
        })()
      `);
      await new Promise(r => setTimeout(r, 400));

      // Test mobile viewport
      console.log('📱 6. Testing mobile responsive layout (390x844)...');
      await sendCommand('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true
      });
      await new Promise(r => setTimeout(r, 600));

      await takeScreenshot(path.join(artifactDir, 'beer-05-mobile-header.png'));
      console.log('📸 Captured beer-05-mobile-header.png');

      // Open beer modal on mobile
      await evalScript(`
        (function() {
          const btn = document.querySelector('.header-beer-btn');
          if (btn) btn.click();
        })()
      `);
      await new Promise(r => setTimeout(r, 1000));
      await takeScreenshot(path.join(artifactDir, 'beer-06-mobile-modal.png'));
      console.log('📸 Captured beer-06-mobile-modal.png');

      const passed = modalInspection.pills.some(p => p.includes('90')) &&
                     modalInspection.pills.some(p => p.includes('150')) &&
                     modalInspection.pills.some(p => p.includes('250')) &&
                     after90.qrCaption.includes('90') &&
                     after250.qrCaption.includes('250');

      if (passed) {
        console.log('🎉 ALL FRONTEND & HEADER BEER TESTS PASSED SUCCESSFULLY!');
        cleanup(0);
      } else {
        console.error('❌ Tiers verification failed!');
        cleanup(1);
      }
    });
  } catch (err) {
    console.error('Test error:', err);
    cleanup(1);
  }
});
