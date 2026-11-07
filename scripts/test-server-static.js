import http from 'http';
import app from '../server/index.js';

async function testStatic() {
  const server = http.createServer(app);
  await new Promise(r => server.listen(3099, r));
  console.log('Testing Express server on port 3099...\n');

  try {
    // 1. Test root / HTML
    const rootRes = await fetch('http://localhost:3099/');
    const rootType = rootRes.headers.get('content-type');
    const rootBody = await rootRes.text();
    console.log(`1. GET / => HTTP ${rootRes.status}, Content-Type: ${rootType}, Has root: ${rootBody.includes('id="root"')}`);
    if (rootRes.status !== 200 || !rootBody.includes('id="root"')) {
      throw new Error('GET / failed');
    }

    // 2. Test /echoes/ HTML
    const htmlRes = await fetch('http://localhost:3099/echoes/');
    const htmlType = htmlRes.headers.get('content-type');
    const htmlBody = await htmlRes.text();
    console.log(`2. GET /echoes/ => HTTP ${htmlRes.status}, Content-Type: ${htmlType}, Has root: ${htmlBody.includes('id="root"')}`);
    if (htmlRes.status !== 200 || !htmlBody.includes('id="root"')) {
      throw new Error('GET /echoes/ failed');
    }

    // 3. Test asset CSS with /echoes/ prefix
    const cssMatch = htmlBody.match(/href="\/echoes\/(assets\/[^"]+\.css)"/);
    if (cssMatch) {
      const cssUrl = `http://localhost:3099/echoes/${cssMatch[1]}`;
      const cssRes = await fetch(cssUrl);
      const cssType = cssRes.headers.get('content-type');
      console.log(`3. GET /echoes/${cssMatch[1]} => HTTP ${cssRes.status}, Content-Type: ${cssType}`);
      if (cssRes.status !== 200 || !cssType?.includes('css')) throw new Error('CSS via /echoes/ failed');
    }

    // 4. Test asset JS with /echoes/ prefix
    const jsMatch = htmlBody.match(/src="\/echoes\/(assets\/[^"]+\.js)"/);
    if (jsMatch) {
      const jsUrl = `http://localhost:3099/echoes/${jsMatch[1]}`;
      const jsRes = await fetch(jsUrl);
      const jsType = jsRes.headers.get('content-type');
      console.log(`4. GET /echoes/${jsMatch[1]} => HTTP ${jsRes.status}, Content-Type: ${jsType}`);
      if (jsRes.status !== 200 || !jsType?.includes('javascript')) throw new Error('JS via /echoes/ failed');
    }

    // 5. Test manifest via /echoes/
    const manifestRes = await fetch('http://localhost:3099/echoes/manifest.webmanifest');
    const manifestType = manifestRes.headers.get('content-type');
    console.log(`5. GET /echoes/manifest.webmanifest => HTTP ${manifestRes.status}, Content-Type: ${manifestType}`);
    if (manifestRes.status !== 200 || !manifestType?.includes('json')) throw new Error('Manifest via /echoes/ failed');

    // 6. Test sw.js via /echoes/
    const swRes = await fetch('http://localhost:3099/echoes/sw.js');
    const swType = swRes.headers.get('content-type');
    console.log(`6. GET /echoes/sw.js => HTTP ${swRes.status}, Content-Type: ${swType}`);
    if (swRes.status !== 200 || !swType?.includes('javascript')) throw new Error('SW via /echoes/ failed');

    // 7. Test API
    const apiRes = await fetch('http://localhost:3099/api/health');
    const apiJson = await apiRes.json();
    console.log(`7. GET /api/health => HTTP ${apiRes.status}, Status: ${apiJson.status}`);

    console.log('\n🎉 ALL EXPRESS PRODUCTION STATIC TESTS PASSED! 🎉');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Static test failed:', err);
    server.close();
    process.exit(1);
  }
}

testStatic();
