import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 5188;
const scriptsDir = path.resolve('scripts');
const publicDir = path.resolve('public');
const outputFile = path.resolve('public/og-banner.png');

const mimeTypes = {
  '.html': 'text/html',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/generate-banner.html';

  let filePath = path.join(scriptsDir, reqPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(publicDir, reqPath);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found: ' + reqPath);
  }
});

server.listen(PORT, async () => {
  console.log(`Banner renderer running on http://localhost:${PORT}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--window-size=1200,630',
    '--hide-scrollbars',
    '--no-sandbox',
    '--disable-gpu',
    `http://localhost:${PORT}/generate-banner.html`
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const targetsRes = await fetch('http://127.0.0.1:9224/json');
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page');

    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      throw new Error('Chrome target not found');
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

    await new Promise(resolve => {
      ws.addEventListener('open', resolve);
    });

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.id && pendingCallbacks.has(msg.id)) {
        const cb = pendingCallbacks.get(msg.id);
        pendingCallbacks.delete(msg.id);
        cb(msg.result);
      }
    });

    await sendCommand('Page.enable');
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 1200,
      height: 630,
      deviceScaleFactor: 1,
      mobile: false
    });

    // Wait for fonts and all images to complete loading
    await sendCommand('Runtime.evaluate', {
      expression: `
        Promise.all([
          document.fonts.ready,
          ...Array.from(document.images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => { img.onload = img.onerror = resolve; });
          })
        ])
      `,
      awaitPromise: true
    });

    // Extra delay for CSS renders, glows, and filter effects
    await new Promise(r => setTimeout(r, 1500));

    const screenshotRes = await sendCommand('Page.captureScreenshot', {
      format: 'png',
      clip: {
        x: 0,
        y: 0,
        width: 1200,
        height: 630,
        scale: 1
      }
    });

    if (screenshotRes && screenshotRes.data) {
      const buffer = Buffer.from(screenshotRes.data, 'base64');
      fs.writeFileSync(outputFile, buffer);
      console.log(`Banner successfully created at: ${outputFile} (${buffer.length} bytes)`);
    } else {
      throw new Error('Failed to capture screenshot: ' + JSON.stringify(screenshotRes));
    }

    ws.close();
    chrome.kill();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Error generating banner:', err);
    chrome.kill();
    server.close();
    process.exit(1);
  }
});
