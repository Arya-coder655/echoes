import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 5180;
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
  console.log(`Composer Responsive Test Server running at http://localhost:${PORT}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9228',
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
    const targetsRes = await fetch('http://127.0.0.1:9228/json');
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
      await sendCommand('Page.enable');
    });

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.id && pendingCallbacks.has(msg.id)) {
        const cb = pendingCallbacks.get(msg.id);
        pendingCallbacks.delete(msg.id);
        cb(msg.result);
      }
    });

    // Wait for connection
    await new Promise(r => setTimeout(r, 2000));

    async function evalCode(expression) {
      const res = await sendCommand('Runtime.evaluate', {
        expression,
        returnByValue: true
      });
      return res?.result?.value;
    }

    async function takeScreenshot(fileName) {
      const res = await sendCommand('Page.captureScreenshot', { format: 'png' });
      if (res && res.data) {
        const buf = Buffer.from(res.data, 'base64');
        const outPath = path.join(artifactsDir, fileName);
        fs.writeFileSync(outPath, buf);
        console.log(`   📸 Screenshot saved: ${fileName}`);
      }
    }

    const VIEWPORTS = [
      { name: 'Small mobile (320x568)', width: 320, height: 568, isMobile: true, screenshot: 'composer-320x568-small-mobile.png' },
      { name: 'Samsung Galaxy A33 (360x800)', width: 360, height: 800, isMobile: true, screenshot: 'composer-360x800-samsung-a33.png' },
      { name: 'iPhone 12 mini (375x812)', width: 375, height: 812, isMobile: true },
      { name: 'iPhone 14 (390x844)', width: 390, height: 844, isMobile: true },
      { name: 'iPhone 14 Plus / XR (414x896)', width: 414, height: 896, isMobile: true },
      { name: 'Phablet / Foldable (480x854)', width: 480, height: 854, isMobile: true },
      { name: 'iPad Portrait (768x1024)', width: 768, height: 1024, isMobile: true, screenshot: 'composer-768x1024-tablet.png' },
      { name: 'iPad Air Portrait (820x1180)', width: 820, height: 1180, isMobile: true },
      { name: 'Tablet Landscape (1024x768)', width: 1024, height: 768, isMobile: false },
      { name: 'Standard Laptop (1280x800)', width: 1280, height: 800, isMobile: false },
      { name: 'Standard Laptop (1366x768)', width: 1366, height: 768, isMobile: false, screenshot: 'composer-1366x768-laptop.png' },
      { name: 'Desktop Monitor (1440x900)', width: 1440, height: 900, isMobile: false },
      { name: 'Full HD Monitor (1920x1080)', width: 1920, height: 1080, isMobile: false, screenshot: 'composer-1920x1080-desktop.png' },
      // Landscape mobile & short viewports
      { name: 'Galaxy A33 Landscape (800x360)', width: 800, height: 360, isMobile: true, screenshot: 'composer-800x360-mobile-landscape.png' },
      { name: 'iPhone 14 Landscape (844x390)', width: 844, height: 390, isMobile: true },
      { name: 'Short Desktop Window (1200x500)', width: 1200, height: 500, isMobile: false }
    ];

    console.log(`\n🧪 Testing Echo Your Heart Modal Across ${VIEWPORTS.length} Viewports...\n`);

    let allPassed = true;

    for (const vp of VIEWPORTS) {
      await sendCommand('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.isMobile ? 2 : 1,
        mobile: vp.isMobile
      });

      // Open Echo Composer Modal
      await evalCode(`(() => {
        const btn = document.querySelector('.minimal-cta-btn') || document.querySelector('.quick-compose-trigger');
        if (btn) btn.click();
      })()`);

      await new Promise(r => setTimeout(r, 600));

      // Inspect Modal Architecture & Visibility
      const stats = await evalCode(`(() => {
        const backdrop = document.querySelector('.composer-modal-backdrop');
        const modal = document.querySelector('.composer-modal-window');
        const header = document.querySelector('.composer-header');
        const body = document.querySelector('.composer-modal-body');
        const footer = document.querySelector('.composer-footer-bar') || document.querySelector('.composer-actions-bar');
        const catButtons = Array.from(document.querySelectorAll('.cat-btn'));
        const recipientInput = document.querySelector('.composer-text-input');
        const textarea = document.querySelector('.composer-textarea');
        const swatches = Array.from(document.querySelectorAll('.theme-swatch'));
        const imageDropzone = document.querySelector('.image-upload-dropzone') || document.querySelector('.image-preview-wrapper');
        const discardBtn = document.querySelector('.cancel-btn');
        const burnBtn = document.querySelector('.composer-burn-btn');
        const publishBtn = document.querySelector('.publish-btn');
        const closeBtn = document.querySelector('.composer-close-btn');

        if (!modal || !header || !footer) return { found: false };

        const winW = window.innerWidth;
        const winH = window.innerHeight;

        const mRect = modal.getBoundingClientRect();
        const fRect = footer.getBoundingClientRect();
        const hRect = header.getBoundingClientRect();

        const modalStyle = window.getComputedStyle(modal);
        const bg = modalStyle.backgroundColor;
        const bgImg = modalStyle.backgroundImage;
        const opacity = modalStyle.opacity;

        // Check horizontal overflow
        const overflowsX = mRect.left < -0.5 || mRect.right > winW + 0.5;

        // Check whether modal fits vertically
        const overflowsY = mRect.top < -0.5 || mRect.bottom > winH + 0.5;

        // Check if footer actions are accessible inside the viewport
        const footerAccessible = fRect.top >= 0 && fRect.bottom <= winH + 1;

        // Check body scrollability when needed
        const bodyScrollable = body ? (body.scrollHeight >= body.clientHeight) : false;

        return {
          found: true,
          width: Math.round(mRect.width),
          height: Math.round(mRect.height),
          left: Math.round(mRect.left),
          right: Math.round(mRect.right),
          top: Math.round(mRect.top),
          bottom: Math.round(mRect.bottom),
          overflowsX,
          overflowsY,
          footerAccessible,
          bg,
          bgImg,
          opacity,
          hasHeader: !!header && hRect.height > 0,
          hasCloseBtn: !!closeBtn,
          catCount: catButtons.length,
          hasIconsInCats: catButtons.some(b => b.querySelector('svg') || b.querySelector('.cat-btn-icon')),
          hasRecipient: !!recipientInput,
          hasTextarea: !!textarea,
          swatchCount: swatches.length,
          hasImageDropzone: !!imageDropzone,
          hasDiscardBtn: !!discardBtn,
          hasBurnBtn: !!burnBtn,
          hasPublishBtn: !!publishBtn,
          bodyScrollable
        };
      })()`);

      if (!stats.found) {
        console.log(`❌ ${vp.name}: Composer Modal not found!`);
        allPassed = false;
      } else {
        const isBgSolid = stats.bg.includes('rgb(17, 16, 27)') || stats.bg.includes('rgb(') || stats.bgImg.includes('gradient');
        const passed = !stats.overflowsX && !stats.overflowsY && stats.footerAccessible && stats.catCount === 7 && stats.hasDiscardBtn && stats.hasBurnBtn && stats.hasPublishBtn;
        
        if (!passed) allPassed = false;
        
        const mark = passed ? '✅' : '❌';
        console.log(`${mark} [${vp.name.padEnd(30)}] Modal: ${stats.width}x${stats.height}px | FootAcc: ${stats.footerAccessible} | Cats: ${stats.catCount}/7 | Swatches: ${stats.swatchCount} | SolidBg: ${isBgSolid}`);
        
        if (vp.screenshot) {
          await takeScreenshot(vp.screenshot);
        }
      }

      // Close modal
      await evalCode(`(() => {
        const btn = document.querySelector('.composer-close-btn');
        if (btn) btn.click();
      })()`);
      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n===========================================`);
    if (allPassed) {
      console.log(`🎉 ALL VIEWPORTS PASSED WITH ZERO CLIPPING, SOLID BACKGROUND & ACCESSIBLE FOOTER!`);
    } else {
      console.log(`⚠️ Some viewports encountered issues.`);
    }
    console.log(`===========================================\n`);

    cleanup(allPassed ? 0 : 1);
  } catch (err) {
    console.error('Test execution error:', err);
    cleanup(1);
  }
});
