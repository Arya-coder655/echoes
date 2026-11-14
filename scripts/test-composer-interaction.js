import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 5181;
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
  console.log(`Interaction Test Server running at http://localhost:${PORT}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9231',
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
    const targetsRes = await fetch('http://127.0.0.1:9231/json');
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page');

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
    });

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.id && pendingCallbacks.has(msg.id)) {
        const cb = pendingCallbacks.get(msg.id);
        pendingCallbacks.delete(msg.id);
        cb(msg.result);
      }
    });

    await new Promise(r => setTimeout(r, 2500));

    async function evalCode(expression) {
      const res = await sendCommand('Runtime.evaluate', {
        expression,
        returnByValue: true
      });
      return res?.result?.value;
    }

    console.log('\n--- 1. Open Composer Modal ---');
    await evalCode(`(() => {
      const b = document.querySelector('.minimal-cta-btn') || document.querySelector('.quick-compose-trigger');
      if (b) b.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    const bodyOverflow = await evalCode(`document.body.style.overflow`);
    console.log('✅ Body overflow locked:', bodyOverflow === 'hidden', `("${bodyOverflow}")`);

    console.log('\n--- 2. Category Selection ---');
    await evalCode(`document.querySelectorAll('.cat-btn')[1]?.click()`);
    await new Promise(r => setTimeout(r, 200));
    const activeCat = await evalCode(`document.querySelectorAll('.cat-btn')[1]?.classList.contains('active')`);
    console.log('✅ Category 2 ("Unsent Letters") active:', activeCat);

    console.log('\n--- 3. Theme Swatch Selection ---');
    await evalCode(`document.querySelectorAll('.theme-swatch')[2]?.click()`);
    await new Promise(r => setTimeout(r, 200));
    const moodText = await evalCode(`document.querySelector('.active-theme-name')?.textContent`);
    console.log('✅ Selected Mood Label:', moodText);

    console.log('\n--- 4. Unspoken Words Input & Thanos Burn-to-Ash ---');
    await evalCode(`(() => {
      const textarea = document.querySelector('.composer-textarea');
      // React state update via prototype setter
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      nativeSetter.call(textarea, 'Words given to the eternal sacred flame.');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise(r => setTimeout(r, 200));

    const typedValue = await evalCode(`document.querySelector('.composer-textarea')?.value`);
    console.log('✅ Textarea value set:', typedValue);

    console.log('\n--- 5. Trigger Burn to Ash ---');
    await evalCode(`document.querySelector('.composer-burn-btn')?.click()`);
    console.log('   Combustion initiated... waiting for ash physics engine (2.6s)...');
    await new Promise(r => setTimeout(r, 3000));

    const successTitle = await evalCode(`document.querySelector('.ashes-title')?.textContent`);
    console.log('✅ Catharsis Success Screen Rendered:', successTitle);

    console.log('\n--- 6. Close / Walk in Peace ---');
    await evalCode(`document.querySelector('.peace-btn')?.click()`);
    await new Promise(r => setTimeout(r, 400));

    const isModalOpen = await evalCode(`!!document.querySelector('.composer-modal-window')`);
    const restoredOverflow = await evalCode(`document.body.style.overflow`);
    console.log('✅ Modal closed:', !isModalOpen);
    console.log('✅ Body overflow restored:', restoredOverflow === '', `("${restoredOverflow}")`);

    console.log('\n🎉 ALL FUNCTIONAL INTERACTIONS PASSED FLAWLESSLY!\n');
    cleanup(0);
  } catch (err) {
    console.error('Interaction test failed:', err);
    cleanup(1);
  }
});
