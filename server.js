import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs/promises';
import fssync from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { buildSessionVectorDb } from './src/vectorDb.js';
import {
  analyzeRequirementGaps,
  analyzeTestCoverage,
  analyzeVulnerableAreas
} from './src/analysis.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '2mb' }));

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

const dataDir = path.join(__dirname, 'data');
const sessionsDir = path.join(dataDir, 'sessions');

if (!fssync.existsSync(sessionsDir)) {
  fssync.mkdirSync(sessionsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const sessionId = req.body.sessionId || req.query.sessionId || uuidv4();
      req.sessionId = sessionId;
      const sessionPath = path.join(sessionsDir, sessionId, 'uploads');
      await fs.mkdir(sessionPath, { recursive: true });
      cb(null, sessionPath);
    },
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}_${safe}`);
    }
  }),
  limits: { fileSize: 25 * 1024 * 1024 }
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post(
  '/api/upload',
  upload.fields([
    { name: 'requirements', maxCount: 1 },
    { name: 'defects', maxCount: 1 },
    { name: 'testcases', maxCount: 1 }
  ]),
  async (req, res) => {
    const sessionId = req.sessionId;
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

    const reqFile = req.files?.requirements?.[0];
    const defectsFile = req.files?.defects?.[0];
    const tcFile = req.files?.testcases?.[0];

    if (!reqFile || !defectsFile || !tcFile) {
      return res.status(400).json({
        error: 'Missing files. Please upload requirements (Word), defects (spreadsheet), and testcases (spreadsheet).'
      });
    }

    const sessionPath = path.join(sessionsDir, sessionId);
    const manifestPath = path.join(sessionPath, 'manifest.json');

    const manifest = {
      sessionId,
      createdAt: new Date().toISOString(),
      files: {
        requirements: { path: reqFile.path, originalName: reqFile.originalname },
        defects: { path: defectsFile.path, originalName: defectsFile.originalname },
        testcases: { path: tcFile.path, originalName: tcFile.originalname }
      }
    };

    await fs.mkdir(sessionPath, { recursive: true });
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    res.json({ sessionId });
  }
);

app.post('/api/analyze/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const sessionPath = path.join(sessionsDir, sessionId);
  const manifestPath = path.join(sessionPath, 'manifest.json');

  try {
    const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestRaw);

    await buildSessionVectorDb({
      sessionId,
      requirementsPath: manifest.files.requirements.path,
      defectsPath: manifest.files.defects.path,
      testcasesPath: manifest.files.testcases.path
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get('/api/result/:sessionId/requirement-gaps', async (req, res) => {
  try {
    const out = await analyzeRequirementGaps({ sessionId: req.params.sessionId });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get('/api/result/:sessionId/test-coverage', async (req, res) => {
  try {
    const out = await analyzeTestCoverage({ sessionId: req.params.sessionId });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get('/api/result/:sessionId/vulnerable-areas', async (req, res) => {
  try {
    const out = await analyzeVulnerableAreas({ sessionId: req.params.sessionId });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`QA Analyzer Agent running on http://localhost:${port}`);
});
