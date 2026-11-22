import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 5188;
const distDir = path.resolve('dist');
const artifactsDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\e905dacb-20cf-4846-aed4-7bc34f7151d8';

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
  if (reqPath.startsWith('/echoes')) reqPath = reqPath.replace(/^\/echoes/, '') || '/index.html';
  const filePath = path.join(distDir, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, async () => {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9235',
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

  await new Promise(r => setTimeout(r, 1500));

  try {
    const targetsRes = await fetch('http://127.0.0.1:9235/json');
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    let messageId = 1;
    const pending = new Map();

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    });

    function sendCommand(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = messageId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    if (ws.readyState !== 1) {
      await new Promise(r => ws.addEventListener('open', r, { once: true }));
    }

    await sendCommand('Page.enable');
    await sendCommand('Runtime.enable');

    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false
    });

    await new Promise(r => setTimeout(r, 3500));

    // Open first comment drawer
    await sendCommand('Runtime.evaluate', {
      expression: 'document.querySelector(".comment-pill").click()'
    });
    await new Promise(r => setTimeout(r, 1000));

    // Click Reply on first comment
    await sendCommand('Runtime.evaluate', {
      expression: 'document.querySelector(".comment-reply-action-btn").click()'
    });
    await new Promise(r => setTimeout(r, 500));

    // Type and click send using native setter
    await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const input = document.querySelector('.drawer-comment-input');
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, "I feel the same! That's why I keep coming back.");
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const sendBtn = document.querySelector('.drawer-send-btn');
        sendBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1200));

    // Check tree in DOM
    const treeCheck = await sendCommand('Runtime.evaluate', {
      expression: `(() => {
        const repliesContainer = document.querySelector('.comment-replies-container');
        const replyBubbles = document.querySelectorAll('.comment-bubble-reply');
        const nodes = Array.from(document.querySelectorAll('.comment-node')).map(n => ({
          author: n.querySelector('.comment-author-name')?.textContent,
          text: n.querySelector('.comment-body')?.textContent,
          isReply: n.classList.contains('comment-reply-node')
        }));
        return {
          hasRepliesContainer: !!repliesContainer,
          replyBubblesCount: replyBubbles.length,
          nodes
        };
      })()`,
      returnByValue: true
    });
    console.log('Tree check result:', JSON.stringify(treeCheck.result?.value, null, 2));

    const shotTree = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'stranger-nested-thread-rendered.png'), Buffer.from(shotTree.data, 'base64'));
    console.log('📸 Saved: stranger-nested-thread-rendered.png');

    cleanup(0);
  } catch (err) {
    console.error(err);
    cleanup(1);
  }
});
