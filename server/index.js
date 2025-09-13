import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import FormData from 'form-data';
import { VertexAI } from '@google-cloud/vertexai';

const PORT = process.env.PORT || 8080;

// Google Cloud Credentials (for /compose endpoint)
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.PROJECT_ID;
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || process.env.LOCATION || 'us-central1';
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

// Stability AI Credentials (for /generate endpoint)
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const STABLE_AUDIO_API_URL = 'https://api.stability.ai/v2beta/audio/stable-audio-2/text-to-audio';


// Load DB (copy kept under server/data). Keep in sync with web/data.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'data', 'sound_map.json');
const SOUND_DB = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// This function still uses Vertex AI to generate the detailed prompt
function buildSystemPrompt() {
  return `You are a meticulous music prompt designer.
Follow these exact rules and output both: (1) a Korean text prompt and (2) a structured JSON spec.

// The user will provide a sound_type: 'notification' or 'ringtone'.
// Your output text should be tailored to this type.

1) Role Assignment (fundamental):
- Input: traits [{charm_name, stage ∈ 1..6}]. Higher stage wins. On ties, prefer higher international note: C < D < E < F < G < A < B.
- Output roles by rank: 1st=Lead (Main Melody), 2nd-3rd=Support (Harmony & Sub-Melody), 4th-5th=FX (Accent & FX), others=Ambience (Mood Setters).

2) Melody Concept (final version):
- Use the categories' international note mapping (Do=C, Re=D, Mi=E, Fa=F, Sol=G, La=A, Si=B); category → root note.
- Use lead + supports' roots (in that order, remove duplicates, up to 3) as the core melody notes.
- The prompt must explicitly include: "The core notes of the melody should be X, Y, and Z." (English line).

3) Rhythm Concept (by stage, 1..6):
- Stage 1-2: eighth-note based. Descriptive KR: "짧고 리드미컬하며 경쾌한".
- Stage 3-4: quarter-note centered. KR: "안정적이고 걷는듯한 보통 빠르기의".
- Stage 5: dotted quarter-note centered. KR: "길고 여유로우며 서정적인 호흡의".
- Stage 6: dotted half-note centered. KR: same as stage 5.

4) Tempo Concept (by average scale degree):
- Convert all selected traits' international notes to degrees Do=1..Si=7, average them.
- 1.0–2.5 → Slow/Adagio (~65 BPM)
- 2.6–4.5 → Medium/Moderato (~95 BPM)
- 4.6–7.0 → Fast/Allegro (~125 BPM)

5) Output format:
- Text (Korean):
  {sound_type_korean}, {duration_seconds}초. 전체적인 컨셉은 {한 문장 컨셉}.
  메인멜로디는 {lead_instrument}로 연주되며, {core_notes KR 설명}. The core notes of the melody should be {X, Y, Z}. 리듬은 {리듬 서술 키워드}, {상세 리듬 설명} 특징을 보임.
  배경에는 {support_instruments}가 {화성 역할}을 수행하며, 가끔씩 {fx_instruments}가 {질감 역할}을 더해줌.
  전체 장르는 {장르1, 장르2}이며, 템포는 {tempo_label} · 약 {bpm} BPM임. 핵심 분위기 키워드는 {키워드들}임. 단, {제외키워드}는 사용하지 말 것.

- JSON (spec):
  {
    "duration_seconds": int,
    "roles": {"lead": [..], "support": [..], "fx": [..], "ambience": [..]},
    "melody": {"core_notes": [..], "notes_text": str, "rhythm_text": str, "rhythm_detail": str},
    "instruments": {"lead": str, "support": [..], "fx": [..]},
    "genres": [..],
    "tempo": {"label": str, "bpm": int},
    "key": str, "time_signature": "4/4",
    "keywords": [..], "avoid": [..]
  }

Be consistent and concise. Follow the ranking and mappings strictly.`;
}

function categoryNoteLookup(name) {
  for (const cat of SOUND_DB.sound_map || []) {
    for (const ch of cat.charms || []) {
      if (ch.charm_name === name) return { category: cat.category_name, root: cat.international_note, keywords: ch.keywords || [] };
    }
  }
  return { category: null, root: null, keywords: [] };
}

function buildMessages(payload) {
  const { traits = [], context = {} } = payload;
  const sound_type = context.sound_type || 'ringtone'; // default to ringtone

  // Enrich with roots
  const enriched = traits.map((t, idx) => {
    const stage = Number(t.stage ?? 1);
    const info = categoryNoteLookup(t.charm_name || t.name);
    return { idx, name: t.charm_name || t.name, stage, root: info.root, category: info.category, keywords: info.keywords };
  });
  const sys = buildSystemPrompt();

  // Build a context for the prompt generation, including the sound type and duration
  const userContext = {
    sound_type: sound_type,
    sound_type_korean: sound_type === 'notification' ? '짧은 알림음' : '벨소리',
    duration_seconds: sound_type === 'notification' ? 5 : 25
  };

  const user = {
    traits: enriched,
    context: userContext,
  };
  return { sys, user };
}

app.post('/compose', async (req, res) => {
  try {
    if (!PROJECT) throw new Error('PROJECT_ID/GOOGLE_CLOUD_PROJECT env not set');
    const vertexAI = new VertexAI({ project: PROJECT, location: LOCATION });
    const { sys, user } = buildMessages(req.body || {});
    const model = vertexAI.getGenerativeModel({
      model: MODEL,
    });

    const contents = [
      { role: 'user', parts: [{ text: JSON.stringify(user) }] },
    ];
    const result = await model.generateContent({
      contents,
      systemInstruction: { parts: [{ text: sys }] },
    });
    const outText = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let spec = null; let prompt = null;
    const jsonMatch = outText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { spec = JSON.parse(jsonMatch[0]); } catch {}
    }
    prompt = outText.replace(/```[a-z]*|```/g, '').trim();

    res.json({ prompt, spec, raw: outText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// Text-to-music proxy using Stability AI, based on official V2 documentation
app.post('/generate', async (req, res) => {
    try {
        if (!STABILITY_API_KEY || STABILITY_API_KEY === 'YOUR_STABILITY_AI_KEY_HERE') {
            throw new Error('STABILITY_API_KEY env not set or is a placeholder. Please check your .env file.');
        }

        const { spec = {}, prompt = '' } = req.body || {};
        
        const fullPrompt = [
            prompt,
            spec.genres?.length ? `Genres: ${spec.genres.join(', ')}` : '',
            spec.tempo?.label || spec.tempo?.bpm ? `Tempo: ${spec.tempo?.label || ''} ${spec.tempo?.bpm ? '('+spec.tempo.bpm+' BPM)' : ''}` : '',
            spec.instruments?.lead ? `Lead instrument: ${spec.instruments.lead}` : '',
            spec.keywords?.length ? `Mood: ${spec.keywords.join(', ')}` : ''
        ].filter(Boolean).join('. ');

        const payload = {
            prompt: fullPrompt,
            duration: spec.duration_seconds || 25, // API expects 'duration', not 'duration_seconds'
            output_format: 'mp3',
            model: 'stable-audio-2.5' // Using the latest model as per the docs
        };

        console.log(`Requesting audio from Stability AI with prompt: ${payload.prompt}`);

        const response = await axios.postForm(
            STABLE_AUDIO_API_URL,
            axios.toFormData(payload, new FormData()),
            {
                validateStatus: undefined,
                responseType: "arraybuffer",
                headers: {
                    Authorization: `Bearer ${STABILITY_API_KEY}`,
                    Accept: "audio/*",
                },
            }
        );

        if (response.status === 200) {
            const audio_base64 = Buffer.from(response.data, 'binary').toString('base64');
            const mime = response.headers['content-type'] || 'audio/mp3';
            res.json({ audio_base64, mime });
        } else {
            throw new Error(`Stability AI returned an error: ${response.status} ${response.data.toString()}`);
        }

    } catch (err) {
        const errorMessage = err.response ? err.response.data.toString() : err.message;
        console.error("Error during Stability AI generation:", errorMessage);
        res.status(500).json({ error: errorMessage });
    }
});

app.get('/healthz', (req, res) => res.send('ok'));

app.get('/debugz', (req, res) => {
  try {
    const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
    const credsPathExists = credsPath ? fs.existsSync(credsPath) : false;
    res.json({
      project: PROJECT || null,
      location: LOCATION || null,
      geminiModel: MODEL || null,
      stabilityKey: STABILITY_API_KEY ? 'Set' : 'Not Set',
      credsPath,
      credsPathExists,
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`Gemini proxy running on :${PORT}`);
});
