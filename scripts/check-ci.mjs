async function checkCi() {
  const res = await fetch('https://api.github.com/repos/Trigueiro17/Cs-Arena/actions/runs', {
    headers: { 'User-Agent': 'Node.js' }
  });
  if (!res.ok) {
    console.log('GitHub API status:', res.status, await res.text());
    return;
  }
  const data = await res.json();
  console.log('Total runs:', data.total_count);
  for (const run of data.workflow_runs.slice(0, 5)) {
    console.log(`Run #${run.run_number} (${run.head_sha.slice(0, 7)}): ${run.status} - ${run.conclusion} - ${run.name} - ${run.html_url}`);
  }
}
checkCi().catch(console.error);
