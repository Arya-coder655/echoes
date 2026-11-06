import { spawn } from 'child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9228',
  '--no-sandbox',
  '--disable-gpu',
  'https://arya-coder655.github.io/echoes/#admin'
]);

setTimeout(async () => {
  try {
    const targetsRes = await fetch('http://127.0.0.1:9228/json');
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page');
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    function sendCommand(method, params = {}) {
      return new Promise((resolve) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (e) => {
          const m = JSON.parse(e.data.toString());
          if (m.id === id) {
            ws.removeEventListener('message', handler);
            resolve(m.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.addEventListener('open', async () => {
      // Set session PIN directly into sessionStorage and trigger login check
      await sendCommand('Runtime.evaluate', {
        expression: `
          sessionStorage.setItem('echoes_admin_pin', 'arya2026');
          const input = document.querySelector('input[type="password"]');
          if (input) {
            input.value = 'arya2026';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            document.querySelector('.admin-login-submit')?.click();
          }
        `
      });

      // Wait 3 seconds for authentication to complete
      await new Promise(r => setTimeout(r, 3000));

      const tabRes = await sendCommand('Runtime.evaluate', {
        expression: `
          (function() {
            const buttons = Array.from(document.querySelectorAll('.admin-tab-btn'));
            const analyticsBtn = buttons.find(b => b.innerText.includes('Analytics'));
            if (analyticsBtn) analyticsBtn.click();
            return {
              isLoggedIn: Boolean(document.querySelector('.admin-dashboard-body')),
              tabNames: buttons.map(b => b.innerText.trim().replace(/\\n/g, ' ')),
              hasAnalyticsBtn: Boolean(analyticsBtn)
            };
          })()
        `,
        returnByValue: true
      });

      console.log('Login & Tab Check:', tabRes.result.value);

      // Wait 1.5s for tab render
      await new Promise(r => setTimeout(r, 1500));

      const chartRes = await sendCommand('Runtime.evaluate', {
        expression: `
          (function() {
            return {
              hasChart: Boolean(document.querySelector('.analytics-svg-chart')),
              chartHeading: document.querySelector('.analytics-chart-heading')?.innerText,
              cardValues: Array.from(document.querySelectorAll('.analytics-card-value')).map(el => el.innerText.trim())
            };
          })()
        `,
        returnByValue: true
      });

      console.log('✨ CHART VERIFICATION RESULT:', chartRes.result.value);

      ws.close();
      chrome.kill();
      process.exit(0);
    });
  } catch (err) {
    console.error(err);
    chrome.kill();
    process.exit(1);
  }
}, 2000);
