const params = new URLSearchParams(window.location.search);
const sessionId = params.get('sessionId');

const titleEl = document.getElementById('resultTitle');
const bodyEl = document.getElementById('resultBody');
const downloadActions = document.getElementById('downloadActions');
const btnDownloadPdf = document.getElementById('btnDownloadPdf');
const btnDownloadMissingTests = document.getElementById('btnDownloadMissingTests');

const btnGaps = document.getElementById('btnGaps');
const btnCoverage = document.getElementById('btnCoverage');
const btnVulnerable = document.getElementById('btnVulnerable');

let currentView = '';

function setLoading(title) {
  titleEl.textContent = title;
  bodyEl.textContent = 'Loading...';
  downloadActions.style.display = 'none';
}

async function load(endpoint, title, view) {
  if (!sessionId) {
    titleEl.textContent = 'Missing sessionId';
    bodyEl.textContent = 'Go back and re-run analysis.';
    return;
  }

  setLoading(title);
  currentView = view;

  const res = await fetch(endpoint);
  const json = await res.json();
  if (!res.ok) {
    bodyEl.textContent = json.error || 'Request failed';
    return;
  }

  bodyEl.innerHTML = json.html;
  downloadActions.style.display = 'flex';
  btnDownloadMissingTests.style.display = view === 'test-coverage' ? 'inline-block' : 'none';
}

btnGaps.addEventListener('click', () =>
  load(`/api/result/${encodeURIComponent(sessionId)}/requirement-gaps`, 'Requirement Gaps', 'requirement-gaps')
);

btnCoverage.addEventListener('click', () =>
  load(`/api/result/${encodeURIComponent(sessionId)}/test-coverage`, 'Test Coverage', 'test-coverage')
);

btnVulnerable.addEventListener('click', () =>
  load(`/api/result/${encodeURIComponent(sessionId)}/vulnerable-areas`, 'Vulnerable Areas', 'vulnerable-areas')
);

btnDownloadPdf.addEventListener('click', () => {
  const url = `/api/result/${encodeURIComponent(sessionId)}/${currentView}/pdf`;
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  a.click();
});

btnDownloadMissingTests.addEventListener('click', () => {
  const url = `/api/result/${encodeURIComponent(sessionId)}/test-coverage/missing-tests-xlsx`;
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  a.click();
});

// Auto-load the first view
btnGaps.click();
