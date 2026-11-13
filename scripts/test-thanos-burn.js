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
  console.log(`Thanos Burn Test Server running at http://localhost:${PORT}`);
  
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
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

      await new Promise(r => setTimeout(r, 1000));

      console.log('🧪 1. Locating Sacred Hearth entry button...');
      const openResult = await evalScript(`
        (function() {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Burn a Regret') || b.textContent.includes('Sacred Hearth'));
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        })()
      `);
      console.log('Sacred Hearth button clicked:', openResult);

      await new Promise(r => setTimeout(r, 600));

      const modalOpen = await evalScript(`
        (function() {
          const panel = document.querySelector('.ritual-modal-panel');
          const textarea = document.querySelector('.parchment-textarea');
          const burnBtn = document.querySelector('.burn-ignite-btn');
          return {
            hasPanel: !!panel,
            hasTextarea: !!textarea,
            hasBurnBtn: !!burnBtn,
            burnBtnText: burnBtn ? burnBtn.innerText.trim() : null
          };
        })()
      `);
      console.log('Modal inspection before typing:', modalOpen);

      console.log('🧪 2. Writing letter to be burned...');
      await evalScript(`
        (function() {
          const textarea = document.querySelector('.parchment-textarea');
          if (textarea) {
            // Native React value setter
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            nativeInputValueSetter.call(textarea, "I release all fears and guilt into the sacred fire forever.");
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          return false;
        })()
      `);

      await new Promise(r => setTimeout(r, 300));

      const typedState = await evalScript(`
        (function() {
          const textarea = document.querySelector('.parchment-textarea');
          const burnBtn = document.querySelector('.burn-ignite-btn');
          return {
            text: textarea ? textarea.value : '',
            btnDisabled: burnBtn ? burnBtn.disabled : null,
            burnBtnText: burnBtn ? burnBtn.innerText.trim() : null
          };
        })()
      `);
      console.log('Typed state:', typedState);

      const artifactDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\e905dacb-20cf-4846-aed4-7bc34f7151d8';
      await takeScreenshot(path.join(artifactDir, 'burn-01-before-ignition.png'));
      console.log('📸 Captured burn-01-before-ignition.png');

      console.log('🧪 3. Clicking "Burn Letter" to initiate Thanos Snap animation...');
      await evalScript(`
        (function() {
          const burnBtn = document.querySelector('.burn-ignite-btn');
          if (burnBtn) burnBtn.click();
        })()
      `);

      // Catching fire / charring phase (~400ms)
      await new Promise(r => setTimeout(r, 450));
      const ignitingState = await evalScript(`
        (function() {
          const panel = document.querySelector('.ritual-modal-panel');
          const canvas = document.querySelector('.thanos-card-ash-canvas');
          const burnBtn = document.querySelector('.burn-ignite-btn');
          return {
            isWholeCardBurning: panel ? panel.classList.contains('whole-card-burning') : false,
            hasCanvas: !!canvas,
            burnBtnDisabled: burnBtn ? burnBtn.disabled : null,
            burnBtnText: burnBtn ? burnBtn.innerText.trim() : null
          };
        })()
      `);
      console.log('Igniting/Charring state:', ignitingState);
      await takeScreenshot(path.join(artifactDir, 'burn-02-igniting-charring.png'));
      console.log('📸 Captured burn-02-igniting-charring.png');

      // Disintegration / particles phase (~1200ms)
      await new Promise(r => setTimeout(r, 800));
      await takeScreenshot(path.join(artifactDir, 'burn-03-disintegrating-particles.png'));
      console.log('📸 Captured burn-03-disintegrating-particles.png');

      // Wait until total duration passes (~2800ms + buffer)
      console.log('🧪 4. Waiting for Thanos Snap completion and ashes revelation...');
      await new Promise(r => setTimeout(r, 2200));

      const ashesState = await evalScript(`
        (function() {
          const ashesWrap = document.querySelector('.ritual-ashes-state');
          const title = document.querySelector('.ashes-title');
          const desc = document.querySelector('.ashes-description');
          const resetBtn = document.querySelector('.burn-another-btn');
          return {
            hasAshesState: !!ashesWrap,
            title: title ? title.innerText.trim() : null,
            desc: desc ? desc.innerText.trim() : null,
            hasResetBtn: !!resetBtn
          };
        })()
      `);
      console.log('Ashes state:', ashesState);
      await takeScreenshot(path.join(artifactDir, 'burn-04-ashes-catharsis.png'));
      console.log('📸 Captured burn-04-ashes-catharsis.png');

      if (ashesState.hasAshesState && ashesState.title === 'It Has Turned to Ash.') {
        console.log('🎉 SUCCESS: Thanos Snap burn animation completed and transitioned to ashes state flawlessly!');
        cleanup(0);
      } else {
        console.error('❌ FAILURE: Did not transition to ashes state properly:', ashesState);
        cleanup(1);
      }
    });
  } catch (err) {
    console.error('Test execution error:', err);
    cleanup(1);
  }
});
