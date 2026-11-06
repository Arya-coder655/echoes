import { spawn } from 'child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9225',
  '--no-sandbox',
  '--disable-gpu',
  'https://arya-coder655.github.io/echoes/'
]);

setTimeout(async () => {
  try {
    const targetsRes = await fetch('http://127.0.0.1:9225/json');
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page');
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    ws.addEventListener('open', () => {
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression: `({
              navbarPill: document.querySelector('.navbar-souls-pill')?.innerText,
              heroBadgeSouls: document.querySelector('.hero-badge-souls')?.innerText,
              statSouls: document.querySelector('.stat-card-souls .stat-number')?.innerText,
              footerBadge: document.querySelector('.footer-souls-badge')?.innerText
            })`,
            returnByValue: true
          }
        }));
      }, 3000);
    });

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.id === 1) {
        console.log('✨ LIVE DOM PRESENCE AUDIT RESULT:');
        console.log(msg.result.result.value);
        ws.close();
        chrome.kill();
        process.exit(0);
      }
    });
  } catch (err) {
    console.error(err);
    chrome.kill();
    process.exit(1);
  }
}, 2000);
