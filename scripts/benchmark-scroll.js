import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 5188;
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
  console.log(`Scroll Benchmark Server running at http://localhost:${PORT}`);
  
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9235',
    '--no-sandbox',
    '--enable-gpu-rasterization',
    '--window-size=412,915',
    `http://localhost:${PORT}/index.html`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  function cleanup(code = 0) {
    try { chrome.kill(); } catch (e) {}
    server.close();
    process.exit(code);
  }

  try {
    const targetsRes = await fetch('http://127.0.0.1:9235/json');
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
        resolve(data.result || data);
      }
    });

    await new Promise(r => ws.addEventListener('open', r));

    await sendCommand('Runtime.enable');
    await sendCommand('Page.enable');
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2.625,
      mobile: true
    });

    // Wait for splash screen to clear
    await new Promise(r => setTimeout(r, 2200));

    console.log('🧪 Starting Scroll Benchmark on Mobile Viewport...');

    // In-page scroll measurement script:
    // Scrolls continuously down the feed and records frame-by-frame durations (rAF delta)
    const benchmarkResult = await sendCommand('Runtime.evaluate', {
      expression: `
        new Promise((resolve) => {
          let frames = [];
          let lastTime = performance.now();
          let scrollPos = 0;
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          let active = true;

          function onFrame(now) {
            if (!active) return;
            const delta = now - lastTime;
            lastTime = now;
            frames.push(delta);

            scrollPos += 18; // Smooth continuous touch-scroll velocity
            window.scrollTo(0, scrollPos);

            if (scrollPos >= maxScroll || frames.length >= 120) {
              active = false;
              // Compute metrics
              const frameDeltas = frames.slice(5); // skip initial warmup
              const avgDelta = frameDeltas.reduce((a, b) => a + b, 0) / frameDeltas.length;
              const maxDelta = Math.max(...frameDeltas);
              const fps = 1000 / avgDelta;
              const janks = frameDeltas.filter(d => d > 22).length; // frames taking longer than ~45fps
              const stutterRate = ((janks / frameDeltas.length) * 100).toFixed(1);

              resolve({
                totalFrames: frameDeltas.length,
                avgFrameTimeMs: parseFloat(avgDelta.toFixed(2)),
                maxFrameTimeMs: parseFloat(maxDelta.toFixed(2)),
                estimatedFps: parseFloat(fps.toFixed(1)),
                jankFrames: janks,
                stutterRatePercent: parseFloat(stutterRate)
              });
              return;
            }

            requestAnimationFrame(onFrame);
          }

          requestAnimationFrame(onFrame);
        });
      `,
      returnByValue: true,
      awaitPromise: true
    });

    console.log('📊 Benchmark Results:', benchmarkResult?.result?.value || benchmarkResult);

    ws.close();
    cleanup(0);
  } catch (err) {
    console.error('Benchmark Error:', err);
    cleanup(1);
  }
});
