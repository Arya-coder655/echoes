async function check() {
  const res = await fetch('https://echoes-9wsj.onrender.com/echoes/');
  const html = await res.text();
  const scriptMatches = html.match(/src="([^"]+)"/g) || [];
  const cssMatches = html.match(/href="([^"]+)"/g) || [];
  console.log('Script matches on Render:', scriptMatches);
  console.log('CSS matches on Render:', cssMatches);

  for (const s of scriptMatches) {
    const src = s.replace('src="', '').replace('"', '');
    const assetRes = await fetch('https://echoes-9wsj.onrender.com' + src);
    console.log(`Asset ${src} => HTTP ${assetRes.status} (${assetRes.headers.get('content-type')})`);
  }
}
check();
