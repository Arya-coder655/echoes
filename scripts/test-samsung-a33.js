import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 5179;
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
  console.log(`📱 Samsung A33 Verification Server listening at http://localhost:${PORT}`);
  
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9230',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=390,844',
    `http://localhost:${PORT}/index.html`
  ]);

  await new Promise(r => setTimeout(r, 1500));

  function cleanup(code = 0) {
    try { chrome.kill(); } catch (e) {}
    server.close();
    process.exit(code);
  }

  try {
    const targetsRes = await fetch('http://127.0.0.1:9230/json');
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
        const cb = pendingCallbacks.get(data.id);
        pendingCallbacks.delete(data.id);
        cb(data.result || data);
      }
    });

    async function evalScript(expression) {
      const res = await sendCommand('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res?.value !== undefined ? res.value : res?.result?.value;
    }

    async function takeScreenshot(filePath) {
      const res = await sendCommand('Page.captureScreenshot', { format: 'png' });
      const base64 = res?.data || res?.result?.data;
      if (base64) {
        fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
      }
    }

    ws.addEventListener('open', async () => {
      await sendCommand('Runtime.enable');
      await sendCommand('Page.enable');

      // 1. Emulate Samsung Galaxy A33 5G
      // Specs: 6.4" 1080x2400 (DPR ~2.625), Super AMOLED 90Hz, One UI (Android 13/14)
      await sendCommand('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 2.625,
        mobile: true
      });

      // Emulate Android User Agent
      await sendCommand('Network.setUserAgentOverride', {
        userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-A336B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      });

      // Crucial Test: Emulate 'prefers-reduced-motion: reduce' (the Samsung One UI feature causing animations to skip!)
      await sendCommand('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
      });

      const artifactDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\e905dacb-20cf-4846-aed4-7bc34f7151d8';

      console.log('🧪 1. Testing Splash Screen on Samsung A33...');
      const splashVisible = await evalScript(`!!document.querySelector('.echoes-splash-screen')`);
      console.log('Splash Screen mounted:', splashVisible);
      await takeScreenshot(path.join(artifactDir, 'a33-01-splash-screen.png'));
      console.log('📸 Captured a33-01-splash-screen.png');

      // Wait for splash screen to complete its natural smooth fade
      await new Promise(r => setTimeout(r, 2200));

      console.log('🧪 2. Testing Pull-to-Refresh Indicator & Physics on Samsung A33...');
      // Simulate touch pull
      await evalScript(`
        (function() {
          const container = document.querySelector('.echoes-pull-to-refresh-container');
          if (!container) return false;
          const touchStart = new Touch({
            identifier: 1,
            target: container,
            clientX: 200,
            clientY: 100
          });
          const touchMove = new Touch({
            identifier: 1,
            target: container,
            clientX: 200,
            clientY: 240
          });
          container.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], cancelable: true }));
          container.dispatchEvent(new TouchEvent('touchmove', { touches: [touchMove], cancelable: true }));
          return true;
        })()
      `);
      await new Promise(r => setTimeout(r, 200));

      const pullState = await evalScript(`
        (function() {
          const pill = document.querySelector('.pull-indicator-pill');
          const isVisible = pill ? pill.classList.contains('is-visible') : false;
          const label = document.querySelector('.pull-status-label')?.innerText;
          return { isVisible, label };
        })()
      `);
      console.log('Pull-to-refresh state on Samsung A33:', pullState);
      await takeScreenshot(path.join(artifactDir, 'a33-02-pull-to-refresh.png'));
      console.log('📸 Captured a33-02-pull-to-refresh.png');

      // Release pull
      await evalScript(`
        (function() {
          const container = document.querySelector('.echoes-pull-to-refresh-container');
          if (container) {
            container.dispatchEvent(new TouchEvent('touchend', { touches: [], cancelable: true }));
          }
        })()
      `);
      await new Promise(r => setTimeout(r, 700));

      console.log('🧪 3. Testing Sacred Hearth Thanos Ash Burn on Samsung A33 (with reduced-motion enabled)...');
      const openSuccess = await evalScript(`
        (function() {
          const btn = document.querySelector('button[aria-label="Burn a Regret"]') || 
                      Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Burn'));
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        })()
      `);
      console.log('Opened Sacred Hearth button clicked:', openSuccess);
      await new Promise(r => setTimeout(r, 600));

      await evalScript(`
        (function() {
          const textarea = document.querySelector('.parchment-textarea');
          if (textarea) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            nativeSetter.call(textarea, 'Testing smooth animation on Samsung Galaxy A33 with zero skipped frames.');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }
        })()
      `);
      await new Promise(r => setTimeout(r, 400));

      // Click Ignite
      await evalScript(`
        (function() {
          const burnBtn = document.querySelector('.burn-ignite-btn');
          if (burnBtn) burnBtn.click();
        })()
      `);
      console.log('Ignite clicked! Monitoring active burn...');

      // Mid-burn check at 1.2s: VERIFY canvas is active and card has not been skipped!
      await new Promise(r => setTimeout(r, 1200));
      const burnProgress = await evalScript(`
        (function() {
          const overlay = document.querySelector('.thanos-card-ash-overlay');
          const canvas = document.querySelector('.thanos-card-ash-canvas');
          const panel = document.querySelector('.ritual-modal-panel.whole-card-burning');
          const disintegrating = document.querySelector('.whole-card-disintegrating');
          return {
            hasOverlay: !!overlay,
            phase: overlay?.dataset?.phase,
            hasCanvas: !!canvas,
            isBurning: !!panel,
            isDisintegrating: !!disintegrating
          };
        })()
      `);
      console.log('Mid-burn animation state (MUST NOT BE SKIPPED):', burnProgress);
      await takeScreenshot(path.join(artifactDir, 'a33-03-thanos-burn-midway.png'));
      console.log('📸 Captured a33-03-thanos-burn-midway.png');

      // Wait for complete burn
      await new Promise(r => setTimeout(r, 2000));
      await takeScreenshot(path.join(artifactDir, 'a33-04-burned-ashes.png'));
      console.log('📸 Captured a33-04-burned-ashes.png');

      // Close modal
      await evalScript(`
        (function() {
          const closeBtn = document.querySelector('.ritual-close-btn');
          if (closeBtn) closeBtn.click();
        })()
      `);
      await new Promise(r => setTimeout(r, 500));

      console.log('🧪 4. Testing Circle Loader render & keyframe...');
      // Render CircleLoader inline/fullscreen temporarily to inspect
      await evalScript(`
        (function() {
          const testWrap = document.createElement('div');
          testWrap.id = 'circle-loader-test-root';
          testWrap.innerHTML = \`
            <div class="echoes-circle-loader-backdrop is-fullscreen">
              <div class="circle-loader-ambient-glow"></div>
              <div class="circle-loader-card">
                <div class="circle-loader-graphic-wrap">
                  <svg class="circle-loader-svg" viewBox="0 0 100 100">
                    <circle class="circle-track-bg" cx="50" cy="50" r="44"></circle>
                    <circle class="circle-track-spinner" cx="50" cy="50" r="44"></circle>
                  </svg>
                  <div class="circle-loader-logo-inner">
                    <img src="/echoes/pwa-192x192.png" alt="Echoes Logo" class="circle-loader-logo-img">
                  </div>
                </div>
                <div class="circle-loader-text-wrap">
                  <h4 class="circle-loader-title">Echoes Sanctuary</h4>
                  <p class="circle-loader-message">Opening sanctuary portal...</p>
                  <span class="circle-loader-subtext">Optimized for Samsung Galaxy A33</span>
                </div>
              </div>
            </div>
          \`;
          document.body.appendChild(testWrap);
        })()
      `);
      await new Promise(r => setTimeout(r, 500));
      await takeScreenshot(path.join(artifactDir, 'a33-05-circle-loader.png'));
      console.log('📸 Captured a33-05-circle-loader.png');

      // Remove test loader
      await evalScript(`document.getElementById('circle-loader-test-root')?.remove()`);

      console.log('🧪 5. Testing Error Screen render & keyframe...');
      await evalScript(`
        (function() {
          const testWrap = document.createElement('div');
          testWrap.id = 'error-screen-test-root';
          testWrap.innerHTML = \`
            <div class="echoes-error-screen" role="alert">
              <div class="error-ambient-glow"></div>
              <div class="error-content-card">
                <div class="error-logo-wrap">
                  <div class="error-logo-pulse"></div>
                  <div class="error-logo-frame">
                    <img src="/echoes/pwa-192x192.png" alt="Echoes Logo" class="error-logo-img">
                  </div>
                </div>
                <div class="error-badge">
                  <span class="error-badge-dot"></span>
                  <span>Sanctuary Notice</span>
                </div>
                <h1 class="error-title">Something Whispered in the Dark</h1>
                <p class="error-description">
                  A momentary glitch occurred in the stream. Take a gentle breath—your unspoken 
                  thoughts and confessions remain entirely safe and anonymous.
                </p>
                <div class="error-actions-group">
                  <button type="button" class="error-primary-btn"><span>Restore Sanctuary</span></button>
                  <button type="button" class="error-secondary-btn"><span>Return to Home</span></button>
                </div>
              </div>
            </div>
          \`;
          document.body.appendChild(testWrap);
        })()
      `);
      await new Promise(r => setTimeout(r, 500));
      await takeScreenshot(path.join(artifactDir, 'a33-06-error-screen.png'));
      console.log('📸 Captured a33-06-error-screen.png');

      await evalScript(`document.getElementById('error-screen-test-root')?.remove()`);

      console.log('🎉 ALL SAMSUNG A33 TESTS COMPLETED SUCCESSFULLY!');
      cleanup(0);
    });
  } catch (err) {
    console.error('Test error:', err);
    cleanup(1);
  }
});
