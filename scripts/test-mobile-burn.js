import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 5177;
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
  console.log(`Mobile Thanos Burn Test Server running at http://localhost:${PORT}`);
  
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9228',
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

      // Emulate modern mobile device (iPhone 14 / standard 390x844)
      await sendCommand('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true
      });

      await new Promise(r => setTimeout(r, 1000));

      console.log('📱 1. Opening Sacred Hearth on mobile...');
      await evalScript(`
        (function() {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Burn a Regret') || b.textContent.includes('Sacred Hearth'));
          if (btn) btn.click();
        })()
      `);

      await new Promise(r => setTimeout(r, 600));

      console.log('📱 2. Typing confidential letter...');
      await evalScript(`
        (function() {
          const textarea = document.querySelector('.parchment-textarea');
          if (textarea) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            nativeSetter.call(textarea, "I release all pain and regret from the past. I choose freedom and light.");
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })()
      `);

      await new Promise(r => setTimeout(r, 300));
      const artifactDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\e905dacb-20cf-4846-aed4-7bc34f7151d8';
      await takeScreenshot(path.join(artifactDir, 'mobile-01-letter-ready.png'));
      console.log('📸 Captured mobile-01-letter-ready.png');

      console.log('📱 3. Tapping "Burn Letter" on mobile screen...');
      await evalScript(`
        (function() {
          const btn = document.querySelector('.burn-ignite-btn');
          if (btn) btn.click();
        })()
      `);

      // 1. Ignition phase (~350ms)
      await new Promise(r => setTimeout(r, 350));
      await takeScreenshot(path.join(artifactDir, 'mobile-02-igniting.png'));
      console.log('📸 Captured mobile-02-igniting.png');

      // 2. Disintegration & continuous particles sweeping mid-screen (~1100ms)
      await new Promise(r => setTimeout(r, 750));
      await takeScreenshot(path.join(artifactDir, 'mobile-03-mid-burn.png'));
      console.log('📸 Captured mobile-03-mid-burn.png');

      // 3. Late disintegration / dissolving (~2000ms)
      await new Promise(r => setTimeout(r, 850));
      await takeScreenshot(path.join(artifactDir, 'mobile-04-dissolving.png'));
      console.log('📸 Captured mobile-04-dissolving.png');

      // 4. Final ashes screen (~3000ms)
      await new Promise(r => setTimeout(r, 1000));
      await takeScreenshot(path.join(artifactDir, 'mobile-05-ashes.png'));
      console.log('📸 Captured mobile-05-ashes.png');

      const finalState = await evalScript(`
        (function() {
          const ashes = document.querySelector('.ritual-ashes-state');
          const title = document.querySelector('.ashes-title');
          return {
            hasAshes: !!ashes,
            title: title ? title.innerText : null
          };
        })()
      `);
      console.log('Mobile final state:', finalState);

      if (finalState.hasAshes && finalState.title === 'It Has Turned to Ash.') {
        console.log('🎉 SUCCESS: Mobile responsive Thanos snap executed flawlessly!');
        cleanup(0);
      } else {
        console.error('❌ Failed to show ashes on mobile');
        cleanup(1);
      }
    });
  } catch (err) {
    console.error('Test error:', err);
    cleanup(1);
  }
});
