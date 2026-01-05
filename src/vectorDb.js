import path from 'path';
import fs from 'fs/promises';
import fssync from 'fs';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import pdf from 'pdf-parse';

import { embedTexts } from './gemini.js';

const rootDir = path.resolve(process.cwd());
const sessionsDir = path.join(rootDir, 'data', 'sessions');

function chunkText(text, chunkSize = 1200, overlap = 150) {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(cleaned.length, start + chunkSize);
    chunks.push(cleaned.slice(start, end));
    if (end === cleaned.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

async function readRequirementsDoc(requirementsPath) {
  const ext = path.extname(requirementsPath).toLowerCase();
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: requirementsPath });
    return result.value || '';
  } else if (ext === '.pdf') {
    const buffer = await fs.readFile(requirementsPath);
    const data = await pdf(buffer);
    return data.text || '';
  } else {
    throw new Error('Requirements file must be a .docx or .pdf document.');
  }
}

function readSpreadsheetAsText(spreadsheetPath) {
  const workbook = xlsx.readFile(spreadsheetPath);
  const sheetNames = workbook.SheetNames || [];
  const lines = [];

  for (const name of sheetNames) {
    const sheet = workbook.Sheets[name];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });

    for (const row of rows) {
      const cells = (row || []).map((c) => String(c ?? '').trim()).filter(Boolean);
      if (cells.length) lines.push(cells.join(' | '));
    }
  }

  return lines.join('\n');
}

function normalizeVector(v) {
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  return v.map((x) => x / norm);
}

export async function buildSessionVectorDb({
  sessionId,
  requirementsPath,
  defectsPath,
  testcasesPath
}) {
  const sessionPath = path.join(sessionsDir, sessionId);
  if (!fssync.existsSync(sessionPath)) {
    throw new Error(`Unknown sessionId: ${sessionId}`);
  }

  const requirementsText = await readRequirementsDoc(requirementsPath);
  const defectsText = readSpreadsheetAsText(defectsPath);
  const testcasesText = readSpreadsheetAsText(testcasesPath);

  const requirementsChunks = chunkText(requirementsText);
  const defectsChunks = chunkText(defectsText);
  const testcasesChunks = chunkText(testcasesText);

  const all = [
    ...requirementsChunks.map((t) => ({ source: 'requirements', text: t })),
    ...defectsChunks.map((t) => ({ source: 'defects', text: t })),
    ...testcasesChunks.map((t) => ({ source: 'testcases', text: t }))
  ];

  if (!all.length) throw new Error('No text could be extracted from the uploaded files.');

  const vectors = await embedTexts(all.map((x) => x.text));

  const records = all.map((item, i) => ({
    id: `${item.source}_${i}`,
    source: item.source,
    text: item.text,
    vector: normalizeVector(vectors[i])
  }));

  const vectorDbPath = path.join(sessionPath, 'vectorDb.json');
  await fs.writeFile(vectorDbPath, JSON.stringify({ sessionId, records }, null, 2), 'utf-8');

  return { ok: true };
}

export async function vectorSearch({ sessionId, query, sources, topK = 10 }) {
  const sessionPath = path.join(sessionsDir, sessionId);
  const vectorDbPath = path.join(sessionPath, 'vectorDb.json');
  const raw = await fs.readFile(vectorDbPath, 'utf-8');
  const db = JSON.parse(raw);

  const [qVecRaw] = await embedTexts([query]);
  const qVec = normalizeVector(qVecRaw);

  const allowed = new Set((sources || []).filter(Boolean));

  const scored = [];
  for (const rec of db.records || []) {
    if (allowed.size && !allowed.has(rec.source)) continue;

    let dot = 0;
    for (let i = 0; i < qVec.length; i++) dot += qVec[i] * rec.vector[i];
    scored.push({ score: dot, record: rec });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
