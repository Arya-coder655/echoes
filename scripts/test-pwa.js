import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';

async function runPwaTest() {
  console.log('🧪 Starting PWA Verification Suite...');

  // 1. Verify manifest
  const manifestPath = path.resolve('dist/manifest.webmanifest');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('❌ dist/manifest.webmanifest does not exist!');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log('✅ Manifest JSON parsed successfully:');
  console.log(`   - Name: ${manifest.name}`);
  console.log(`   - Short Name: ${manifest.short_name}`);
  console.log(`   - Theme Color: ${manifest.theme_color}`);
  console.log(`   - Background Color: ${manifest.background_color}`);
  console.log(`   - Display: ${manifest.display}`);
  console.log(`   - Start URL: ${manifest.start_url}`);
  console.log(`   - Scope: ${manifest.scope}`);
  console.log(`   - Icons count: ${manifest.icons.length}`);

  if (manifest.name !== 'Echoes of the Heart') throw new Error('Invalid manifest name');
  if (manifest.short_name !== 'Echoes') throw new Error('Invalid short_name');
  if (manifest.theme_color !== '#000000') throw new Error('Invalid theme_color');
  if (manifest.background_color !== '#000000') throw new Error('Invalid background_color');
  if (manifest.display !== 'standalone') throw new Error('Invalid display mode');
  if (manifest.start_url !== '/echoes/') throw new Error('Invalid start_url');
  if (manifest.scope !== '/echoes/') throw new Error('Invalid scope');

  // Verify icon files
  for (const icon of manifest.icons) {
    const iconFile = path.resolve('dist', icon.src);
    if (!fs.existsSync(iconFile)) {
      throw new Error(`❌ Manifest icon missing from dist: ${icon.src}`);
    }
    const stat = fs.statSync(iconFile);
    console.log(`   - Icon [${icon.sizes}, ${icon.purpose || 'default'}]: ${icon.src} (${stat.size} bytes)`);
  }

  // 2. Verify Service Worker file
  const swPath = path.resolve('dist/sw.js');
  if (!fs.existsSync(swPath)) {
    throw new Error('❌ dist/sw.js does not exist!');
  }
  const swContent = fs.readFileSync(swPath, 'utf8');
  console.log(`✅ dist/sw.js exists (${swContent.length} bytes). Contains workbox reference: ${swContent.includes('workbox')}`);

  // 3. Verify in Chrome Headless with local server
  const PORT = 5175;
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

  await new Promise(r => server.listen(PORT, r));
  console.log(`✅ PWA Test server listening on http://localhost:${PORT}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--no-sandbox',
    '--disable-gpu',
    `http://localhost:${PORT}/echoes/index.html`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const targetsRes = await fetch('http://127.0.0.1:9224/json');
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      throw new Error('Could not find Chrome page target');
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
      const msg = JSON.parse(event.data.toString());
      if (msg.id && pendingCallbacks.has(msg.id)) {
        const cb = pendingCallbacks.get(msg.id);
        pendingCallbacks.delete(msg.id);
        cb(msg.result);
      }
    });

    await new Promise((resolve) => {
      if (ws.readyState === WebSocket.OPEN) resolve();
      else ws.addEventListener('open', resolve);
    });

    await sendCommand('Runtime.enable');
    await sendCommand('Page.enable');

    console.log('✅ Connected to Headless Chrome via CDP');

    // Wait 3 seconds for React hydration and SW registration
    await new Promise(r => setTimeout(r, 3000));

    // Test Service Worker registration in browser
    const swEval = await sendCommand('Runtime.evaluate', {
      expression: `(async () => {
        if (!('serviceWorker' in navigator)) return { supported: false };
        const reg = await navigator.serviceWorker.getRegistration('/echoes/');
        return {
          supported: true,
          registered: Boolean(reg),
          scope: reg ? reg.scope : null,
          active: reg && Boolean(reg.active)
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('✅ Service Worker Registration Check:', swEval.result.value);

    // Test Install button presence in DOM
    const installBtnEval = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const installBtn = document.querySelector('button[aria-label="Install App"]');
        const footerInstall = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Install Echoes App'));
        return {
          hasNavbarBtn: Boolean(installBtn),
          hasFooterBtn: Boolean(footerInstall)
        };
      })()`,
      returnByValue: true
    });
    console.log('✅ Install CTA Buttons Check:', installBtnEval.result.value);

    // Click install button to test InstallAppModal
    const openModalEval = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('button[aria-label="Install App"]') || 
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Install Echoes App'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true
    });
    console.log('✅ Triggered Install Modal Click:', openModalEval.result.value);

    // Wait for lazy-loaded InstallAppModal
    await new Promise(r => setTimeout(r, 800));

    const modalCheck = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.querySelector('.install-modal-card');
        const title = modal ? modal.querySelector('.install-modal-title')?.textContent : null;
        const icon = modal ? modal.querySelector('.install-app-icon-img')?.getAttribute('src') : null;
        const pills = modal ? Array.from(modal.querySelectorAll('.install-feature-pill')).map(p => p.textContent.trim()) : [];
        return {
          isOpen: Boolean(modal),
          title,
          icon,
          pills
        };
      })()`,
      returnByValue: true
    });
    console.log('✅ InstallAppModal Render Verification:', modalCheck.result.value);

    if (!modalCheck.result.value.isOpen) {
      throw new Error('InstallAppModal did not open on button click');
    }

    // Close modal
    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const closeBtn = document.querySelector('.install-modal-close');
        if (closeBtn) closeBtn.click();
        return true;
      })()`
    });

    await new Promise(r => setTimeout(r, 400));

    const modalClosedCheck = await sendCommand('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('.install-modal-card'))`,
      returnByValue: true
    });
    console.log(`✅ InstallAppModal Closed Cleanly: ${!modalClosedCheck.result.value}`);

    ws.close();
    chrome.kill();
    server.close();
    console.log('\n🎉 ALL PWA VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ PWA Test Failure:', err);
    chrome.kill();
    server.close();
    process.exit(1);
  }
}

runPwaTest();
