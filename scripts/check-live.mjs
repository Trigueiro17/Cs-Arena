async function check() {
  const res = await fetch('https://cs-crena.vercel.app/');
  const html = await res.text();
  console.log('HTML len:', html.length);
  const match = html.match(/src="(\/assets\/[^"]+)"/);
  console.log('Asset on live Vercel:', match ? match[1] : 'not found');
}
check().catch(console.error);
