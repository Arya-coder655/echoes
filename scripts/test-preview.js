import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 5174;
const distDir = path.resolve('dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
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
  console.log(`Test Preview Server running at http://localhost:${PORT}`);
  
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--no-sandbox',
    '--disable-gpu',
    `http://localhost:${PORT}/index.html`
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const targetsRes = await fetch('http://127.0.0.1:9223/json');
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
      await sendCommand('Log.enable');
    });

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.id && pendingCallbacks.has(msg.id)) {
        const cb = pendingCallbacks.get(msg.id);
        pendingCallbacks.delete(msg.id);
        cb(msg.result);
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
        if (msg.params.type === 'error') {
          console.error(`[BROWSER CONSOLE ERROR]`, text);
        }
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
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

    console.log('\n🧪 --- STARTING 11-MODAL COMPREHENSIVE TEST SUITE ---');

    const testCases = [
      {
        name: '1. About Modal',
        openSelector: 'button[aria-label="About Echoes"]',
        expectedSelector: '.about-modal-backdrop',
        closeSelector: '.about-close-btn'
      },
      {
        name: '2. Zen Cinema Modal',
        openSelector: 'button[aria-label="Zen Cinema"]',
        expectedSelector: '.zen-cinema-fullscreen',
        closeSelector: '.zen-cinema-close'
      },
      {
        name: '3. Whispering Well Modal',
        openSelector: 'button[aria-label="Whispering Well"]',
        expectedSelector: '.well-modal-backdrop',
        closeSelector: '.well-close-btn'
      },
      {
        name: '4. Sacred Hearth (Catharsis Ritual)',
        openSelector: 'button[aria-label="Burn a Regret"]',
        expectedSelector: '.ritual-modal-backdrop',
        closeSelector: '.ritual-close-btn'
      },
      {
        name: '5. Soundscape Rain Mixer',
        openSelector: 'button[aria-label="Soundscape Lounge"]',
        expectedSelector: '.mixer-modal-backdrop',
        closeSelector: '.mixer-close-btn'
      },
      {
        name: '6. Echo Composer',
        openSelector: '.minimal-cta-btn',
        expectedSelector: '.composer-modal-backdrop',
        closeSelector: '.composer-close-btn'
      },
      {
        name: '7. Beer Easter Egg Modal',
        openSelector: 'button[aria-label="Easter egg"]',
        expectedSelector: '.beer-modal-backdrop',
        closeSelector: '.beer-close-btn'
      },
      {
        name: '8. Share Modal',
        openSelector: '.echo-card-footer .share-pill',
        expectedSelector: '.share-modal-backdrop',
        closeSelector: '.share-close-btn'
      },
      {
        name: '9. Comments Drawer',
        openSelector: '.echo-card-footer .comment-pill',
        expectedSelector: '.drawer-backdrop',
        closeSelector: '.drawer-close-btn'
      },
      {
        name: '10. Report Modal',
        openSelector: '.echo-card-footer .report-flag-btn',
        expectedSelector: '.report-modal-backdrop',
        closeSelector: '.report-close-btn'
      },
      {
        name: '11. Sanctuary Guardian / Admin Dashboard',
        openSelector: 'button[aria-label="Guardian Portal"]',
        expectedSelector: '.admin-modal-backdrop',
        closeSelector: '.admin-close-btn'
      }
    ];

    let passedCount = 0;

    for (const tc of testCases) {
      // Click open
      const openResult = await evalCode(`
        (function() {
          const btn = document.querySelector('${tc.openSelector}');
          if (!btn) return 'TRIGGER_NOT_FOUND';
          btn.click();
          return 'TRIGGER_CLICKED';
        })()
      `);

      if (openResult !== 'TRIGGER_CLICKED') {
        console.error(`❌ ${tc.name}: Trigger button not found ('${tc.openSelector}')`);
        continue;
      }

      // Wait 400ms for lazy load & Suspense transition
      await new Promise(r => setTimeout(r, 600));

      // Verify modal is open
      const isOpened = await evalCode(`Boolean(document.querySelector('${tc.expectedSelector}'))`);

      if (isOpened) {
        console.log(`✅ ${tc.name}: Opened successfully!`);
        passedCount++;

        // Close modal
        await evalCode(`
          (function() {
            const closeBtn = document.querySelector('${tc.closeSelector}');
            if (closeBtn) closeBtn.click();
          })()
        `);
        await new Promise(r => setTimeout(r, 400));
      } else {
        console.error(`❌ ${tc.name}: Modal did NOT appear in DOM ('${tc.expectedSelector}')`);
      }
    }

    console.log(`\n🎉 Test Suite Completed: ${passedCount}/${testCases.length} Modals verified functional!`);
    cleanup(passedCount === testCases.length ? 0 : 1);
  } catch (err) {
    console.error('Error during test suite:', err);
    cleanup(1);
  }

  function cleanup(code) {
    try { chrome.kill(); } catch (e) {}
    try { server.close(); } catch (e) {}
    process.exit(code);
  }
});
