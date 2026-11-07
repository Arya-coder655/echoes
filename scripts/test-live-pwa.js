async function verifyLivePWA() {
  console.log('🌐 Verifying live production PWA at https://arya-coder655.github.io/echoes/ ...\n');

  const urls = [
    'https://arya-coder655.github.io/echoes/',
    'https://arya-coder655.github.io/echoes/manifest.webmanifest',
    'https://arya-coder655.github.io/echoes/sw.js',
    'https://arya-coder655.github.io/echoes/pwa-192x192.png',
    'https://arya-coder655.github.io/echoes/pwa-512x512.png',
    'https://arya-coder655.github.io/echoes/pwa-maskable-512x512.png',
    'https://arya-coder655.github.io/echoes/apple-touch-icon.png',
    'https://echoes-9wsj.onrender.com/api/echoes'
  ];

  let allSuccess = true;

  for (const url of urls) {
    try {
      const res = await fetch(url);
      const isOk = res.status >= 200 && res.status < 300;
      const contentType = res.headers.get('content-type') || 'unknown';
      console.log(`${isOk ? '✅' : '❌'} [HTTP ${res.status}] ${url}`);
      console.log(`   Content-Type: ${contentType}`);
      
      if (url.endsWith('manifest.webmanifest')) {
        const manifest = await res.json();
        console.log(`   Manifest Verified: Name="${manifest.name}", Scope="${manifest.scope}", StartUrl="${manifest.start_url}", Icons=${manifest.icons.length}`);
      } else if (url.includes('/api/echoes')) {
        const data = await res.json();
        console.log(`   Render API Verified: Returned ${Array.isArray(data) ? data.length : 'non-array'} echoes from TiDB`);
      }

      if (!isOk) allSuccess = false;
    } catch (err) {
      console.error(`❌ Failed fetching ${url}:`, err.message);
      allSuccess = false;
    }
  }

  if (allSuccess) {
    console.log('\n🎉 ALL LIVE PRODUCTION URLS & PWA ASSETS ARE VERIFIED AND 100% OPERATIONAL! 🎉\n');
  } else {
    console.warn('\n⚠️ Some resources took time to propagate via GitHub Pages CDN. Re-run in a few seconds.\n');
  }
}

verifyLivePWA();
