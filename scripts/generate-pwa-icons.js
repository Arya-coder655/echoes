import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 5192;
const publicDir = path.resolve('public');
const brandArtPath = path.resolve('public/brand-art.jpg');

const brandArtBase64 = fs.readFileSync(brandArtPath).toString('base64');
const brandArtDataUri = `data:image/jpeg;base64,${brandArtBase64}`;

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000000; overflow: hidden; }

    /* Container for 512x512 standard */
    #icon-512 {
      width: 512px;
      height: 512px;
      position: absolute;
      top: 0;
      left: 0;
      background: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    #icon-512 img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Container for 192x192 standard */
    #icon-192 {
      width: 192px;
      height: 192px;
      position: absolute;
      top: 0;
      left: 0;
      background: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    #icon-192 img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Container for 512x512 maskable (with 80% safe zone, pure black background, seamless) */
    #icon-maskable-512 {
      width: 512px;
      height: 512px;
      position: absolute;
      top: 0;
      left: 0;
      background: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    #icon-maskable-512 .art-inner {
      width: 420px;
      height: 420px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    #icon-maskable-512 img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Container for 180x180 Apple touch icon */
    #icon-apple-180 {
      width: 180px;
      height: 180px;
      position: absolute;
      top: 0;
      left: 0;
      background: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    #icon-apple-180 img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  </style>
</head>
<body>
  <div id="target-container"></div>
  <script>
    const dataUri = "${brandArtDataUri}";
    function show(mode) {
      const container = document.getElementById('target-container');
      if (mode === '512') {
        container.innerHTML = '<div id="icon-512"><img src="' + dataUri + '"></div>';
      } else if (mode === '192') {
        container.innerHTML = '<div id="icon-192"><img src="' + dataUri + '"></div>';
      } else if (mode === 'maskable') {
        container.innerHTML = '<div id="icon-maskable-512"><div class="art-inner"><img src="' + dataUri + '"></div></div>';
      } else if (mode === 'apple') {
        container.innerHTML = '<div id="icon-apple-180"><img src="' + dataUri + '"></div>';
      }
    }
  </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(htmlContent);
});

server.listen(PORT, async () => {
  console.log(`Icon rendering server running on port ${PORT}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9230',
    '--window-size=1024,1024',
    '--no-sandbox',
    '--disable-gpu',
    `http://localhost:${PORT}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const targetsRes = await fetch('http://127.0.0.1:9230/json');
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

    await new Promise(resolve => ws.addEventListener('open', resolve));

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.id && pendingCallbacks.has(msg.id)) {
        const cb = pendingCallbacks.get(msg.id);
        pendingCallbacks.delete(msg.id);
        cb(msg.result);
      }
    });

    await sendCommand('Page.enable');

    // 1. Generate 512x512
    await sendCommand('Emulation.setDeviceMetricsOverride', { width: 512, height: 512, deviceScaleFactor: 1, mobile: false });
    await sendCommand('Runtime.evaluate', { expression: 'show("512")' });
    await new Promise(r => setTimeout(r, 600));
    const snap512 = await sendCommand('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 512, height: 512, scale: 1 } });
    fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), Buffer.from(snap512.data, 'base64'));
    console.log('✅ Generated pwa-512x512.png');

    // 2. Generate 192x192
    await sendCommand('Emulation.setDeviceMetricsOverride', { width: 192, height: 192, deviceScaleFactor: 1, mobile: false });
    await sendCommand('Runtime.evaluate', { expression: 'show("192")' });
    await new Promise(r => setTimeout(r, 600));
    const snap192 = await sendCommand('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 192, height: 192, scale: 1 } });
    fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), Buffer.from(snap192.data, 'base64'));
    console.log('✅ Generated pwa-192x192.png');

    // 3. Generate Maskable 512x512
    await sendCommand('Emulation.setDeviceMetricsOverride', { width: 512, height: 512, deviceScaleFactor: 1, mobile: false });
    await sendCommand('Runtime.evaluate', { expression: 'show("maskable")' });
    await new Promise(r => setTimeout(r, 600));
    const snapMaskable = await sendCommand('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 512, height: 512, scale: 1 } });
    fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), Buffer.from(snapMaskable.data, 'base64'));
    console.log('✅ Generated pwa-maskable-512x512.png');

    // 4. Generate Apple Touch Icon 180x180
    await sendCommand('Emulation.setDeviceMetricsOverride', { width: 180, height: 180, deviceScaleFactor: 1, mobile: false });
    await sendCommand('Runtime.evaluate', { expression: 'show("apple")' });
    await new Promise(r => setTimeout(r, 600));
    const snapApple = await sendCommand('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 180, height: 180, scale: 1 } });
    fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), Buffer.from(snapApple.data, 'base64'));
    console.log('✅ Generated apple-touch-icon.png');

    ws.close();
    chrome.kill();
    server.close();
    console.log('🎉 All PWA icons generated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error generating icons:', err);
    chrome.kill();
    server.close();
    process.exit(1);
  }
});
