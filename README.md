# QA Analyzer Agent

## What it does
- Upload:
  - Requirements: Word `.docx` **or** PDF `.pdf`
  - Known defects: Excel `.xlsx` / `.xls`
  - Test cases: Excel `.xlsx` / `.xls`
- Click **Analyze**:
  - Builds a local vector store per upload session using **Gemini embeddings**
  - Navigates to results page with:
    - Requirement Gaps
    - Test Coverage
    - Vulnerable Areas
  - Each view includes **highlighted suggestions**.

## Setup
1. Install dependencies:
   - `npm install`
2. Create a `.env` file (copy from `.env.example`) and set:
   - `GEMINI_API_KEY=...`
3. Run:
   - `npm run dev`
4. Open:
   - http://localhost:3000

## Notes
- Requirements can be `.docx` or `.pdf`.
- Spreadsheets are converted to text by reading all rows and joining cells with `|`.
- Session data is stored in `data/sessions/<sessionId>`.
