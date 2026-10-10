async function checkStatuses() {
  const res = await fetch('https://api.github.com/repos/Trigueiro17/Cs-Arena/commits/73f81c2/statuses', {
    headers: { 'User-Agent': 'Node.js' }
  });
  const data = await res.json();
  console.log('Statuses count:', data.length);
  for (const s of data) {
    console.log(`Context: ${s.context} - State: ${s.state} - Desc: ${s.description} - URL: ${s.target_url}`);
  }
}
checkStatuses().catch(console.error);
