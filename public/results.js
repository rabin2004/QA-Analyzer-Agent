const params = new URLSearchParams(window.location.search);
const sessionId = params.get('sessionId');

const titleEl = document.getElementById('resultTitle');
const bodyEl = document.getElementById('resultBody');

const btnGaps = document.getElementById('btnGaps');
const btnCoverage = document.getElementById('btnCoverage');
const btnVulnerable = document.getElementById('btnVulnerable');

function setLoading(title) {
  titleEl.textContent = title;
  bodyEl.textContent = 'Loading...';
}

async function load(endpoint, title) {
  if (!sessionId) {
    titleEl.textContent = 'Missing sessionId';
    bodyEl.textContent = 'Go back and re-run analysis.';
    return;
  }

  setLoading(title);

  const res = await fetch(endpoint);
  const json = await res.json();
  if (!res.ok) {
    bodyEl.textContent = json.error || 'Request failed';
    return;
  }

  // Server returns html pre-highlighted; display as HTML while keeping monospaced layout
  bodyEl.innerHTML = json.html;
}

btnGaps.addEventListener('click', () =>
  load(`/api/result/${encodeURIComponent(sessionId)}/requirement-gaps`, 'Requirement Gaps')
);

btnCoverage.addEventListener('click', () =>
  load(`/api/result/${encodeURIComponent(sessionId)}/test-coverage`, 'Test Coverage')
);

btnVulnerable.addEventListener('click', () =>
  load(`/api/result/${encodeURIComponent(sessionId)}/vulnerable-areas`, 'Vulnerable Areas')
);

// Auto-load the first view
btnGaps.click();
