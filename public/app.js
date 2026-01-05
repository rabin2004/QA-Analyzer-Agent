const form = document.getElementById('uploadForm');
const statusEl = document.getElementById('status');
const analyzeBtn = document.getElementById('analyzeBtn');

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle('error', isError);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  analyzeBtn.disabled = true;
  setStatus('Uploading files...');

  const fd = new FormData(form);

  try {
    const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
    const uploadJson = await uploadRes.json();
    if (!uploadRes.ok) throw new Error(uploadJson.error || 'Upload failed');

    const { sessionId } = uploadJson;

    setStatus('Building vector DB and analyzing...');

    const analyzeRes = await fetch(`/api/analyze/${encodeURIComponent(sessionId)}`, {
      method: 'POST'
    });
    const analyzeJson = await analyzeRes.json();
    if (!analyzeRes.ok) throw new Error(analyzeJson.error || 'Analyze failed');

    window.location.href = `/results.html?sessionId=${encodeURIComponent(sessionId)}`;
  } catch (err) {
    setStatus(err.message || String(err), true);
    analyzeBtn.disabled = false;
  }
});
