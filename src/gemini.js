import { GoogleGenerativeAI } from '@google/generative-ai';

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY. Set it in your environment or .env file.');
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function embedTexts(texts) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  const out = [];
  for (const t of texts) {
    const res = await model.embedContent(t);
    const vec = res?.embedding?.values;
    if (!Array.isArray(vec)) throw new Error('Unexpected embedding response from Gemini.');
    out.push(vec);
  }
  return out;
}

export async function generateText({ system, user }) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: 'text-bison-001' });

  const res = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: `${system}\n\n${user}` }] }
    ]
  });

  return res.response.text();
}
