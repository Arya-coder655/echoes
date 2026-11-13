import { spawn } from 'child_process';

const LIVE_URL = 'https://arya-coder655.github.io/echoes/';

console.log(`Connecting to live GitHub Pages website: ${LIVE_URL}`);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9224',
  '--no-sandbox',
  '--disable-gpu',
  LIVE_URL
]);

await new Promise(r => setTimeout(r, 2500));

try {
  const targetsRes = await fetch('http://127.0.0.1:9224/json');
  const targets = await targetsRes.json();
  const pageTarget = targets.find(t => t.type === 'page');

  if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
    console.error('Could not find page target or ws URL');
    cleanup(1);
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
        console.error(`[LIVE CONSOLE ERROR]`, text);
      }
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[LIVE EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
    }
  });

  // Wait for initial live load
  await new Promise(r => setTimeout(r, 3000));

  async function evalCode(expression) {
    const res = await sendCommand('Runtime.evaluate', {
      expression,
      returnByValue: true
    });
    return res?.result?.value;
  }

  console.log('\n🧪 --- AUDITING LIVE GITHUB PAGES: ALL 10 MODALS ---');

  const testCases = [
    {
      name: '1. About Modal',
      openSelector: '.footer-about-pill-btn',
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
      name: '3. Sacred Hearth (Catharsis Ritual)',
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
      name: '11. Sanctuary Guardian (Stealth via #admin URL Hash)',
      isHashTrigger: true,
      hash: '#admin',
      expectedSelector: '.admin-modal-backdrop',
      closeSelector: '.admin-close-btn'
    }
  ];

  let passed = 0;

  for (const tc of testCases) {
    if (tc.isHashTrigger) {
      // Verify Guardian button is completely removed from footer
      const btnExists = await evalCode(`Boolean(document.querySelector('button[aria-label="Guardian Portal"]'))`);
      if (btnExists) {
        console.error(`❌ ${tc.name}: Guardian button still visible in footer!`);
      } else {
        console.log(`✅ ${tc.name}: Verified Guardian button completely hidden/removed from public UI!`);
      }

      // Trigger stealth access via URL hash
      await evalCode(`window.location.hash = '${tc.hash}'`);
    } else {
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
    }

    // Wait for network chunk & Suspense transition
    await new Promise(r => setTimeout(r, 1200));

    const isOpened = await evalCode(`Boolean(document.querySelector('${tc.expectedSelector}'))`);

    if (isOpened) {
      console.log(`✅ ${tc.name}: LIVE PASSED (Modal successfully mounted in DOM)`);
      passed++;

      // Close modal
      await evalCode(`
        (function() {
          const closeBtn = document.querySelector('${tc.closeSelector}');
          if (closeBtn) closeBtn.click();
        })()
      `);
      await new Promise(r => setTimeout(r, 600));
    } else {
      console.error(`❌ ${tc.name}: LIVE FAILED (Selector '${tc.expectedSelector}' not found in DOM)`);
    }
  }

  console.log(`\n🎉 Live Audit Completed: ${passed}/${testCases.length} Modals verified working on production!`);
  cleanup(passed === testCases.length ? 0 : 1);
} catch (err) {
  console.error('Error during live audit:', err);
  cleanup(1);
}

function cleanup(code) {
  try { chrome.kill(); } catch (e) {}
  process.exit(code);
}
