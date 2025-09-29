// IP usage tracking (global Map to persist across function calls)
let ipUsage = global.ipUsage || new Map();
global.ipUsage = ipUsage;

const MAX_USES_PER_IP = 2;

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         'unknown';
}

function checkIPLimit(ip) {
  const usage = ipUsage.get(ip);
  
  if (!usage) {
    ipUsage.set(ip, { count: 0, createdAt: new Date() });
    return { allowed: true, remaining: MAX_USES_PER_IP, used: 0 };
  }
  
  const remaining = MAX_USES_PER_IP - usage.count;
  const used = usage.count;
  return { allowed: remaining > 0, remaining, used };
}

function incrementIPUsage(ip) {
  const usage = ipUsage.get(ip);
  if (usage) {
    usage.count = Math.min(usage.count + 1, MAX_USES_PER_IP);
  } else {
    // If for some reason usage doesn't exist, create it
    ipUsage.set(ip, { count: 1, createdAt: new Date() });
  }
  console.log(`IP ${ip} usage incremented. New count: ${usage ? usage.count : 1}`);
}

// Simple composition logic
function composeLocal(constellation, context = {}) {
  const { traits = [] } = constellation;
  const durationSeconds = context.duration_seconds || 60;
  
  // Create a basic spec based on traits
  const traitNames = traits.map(t => t.charm_name).join(', ');
  
  return {
    duration_seconds: durationSeconds,
    instruments: { lead: '피아노', support: ['현악기'], fx: ['벨'] },
    genres: ['Ambient', 'Cinematic'],
    tempo: { label: 'Moderato', bpm: 95 },
    keywords: ['평화로운', '편안한', '따뜻한', traitNames]
  };
}

function fillTemplate(spec) {
  const { instruments, tempo, keywords, duration_seconds } = spec;
  return `${duration_seconds}초 길이의 벨소리. 메인 멜로디는 ${instruments.lead}로 연주되며, 템포는 ${tempo.label} 약 ${tempo.bpm} BPM입니다. 전체적인 분위기는 ${keywords.slice(0,3).join(', ')}입니다.`;
}

async function optimizePromptViaGemini(spec, prompt) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDummklvhgY_4KZn0z-9ndsI0hyvfL1aR4";
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set, skipping optimization');
    return prompt;
  }

  try {
    const systemPrompt = `당신은 한국어 음악 프롬프트 에디터입니다. 음악 생성 모델에 적합하도록 한국어 프롬프트를 다듬고 더 자연스럽게 개선하세요. 반환은 한국어 최종 프롬프트 텍스트만 출력하세요.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const body = {
      system_instruction: { role: 'system', parts: [{ text: systemPrompt }] },
      contents: [{
        role: 'user',
        parts: [
          { text: 'SPEC:' },
          { text: JSON.stringify(spec, null, 2) },
          { text: 'PROMPT_DRAFT:' },
          { text: prompt }
        ]
      }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const outText = parts.map(p => p.text || '').join('\n');
    return outText.replace(/```[a-z]*|```/g, '').trim() || prompt;
  } catch (error) {
    console.error('Gemini optimization failed:', error.message);
    return prompt;
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // 사용량 체크 제거 - 항상 무제한 반환
    return res.json({ remaining: 999, used: 0, maxUses: 999 });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clientIP = getClientIP(req);
    console.log(`Generation request from IP: ${clientIP}`);
    
    // IP 제한 체크 제거

    // Hardcoded API keys (temporary solution)
    const STABILITY_API_KEY = process.env.STABILITY_API_KEY || "sk-noCZyYl1klvcaeOQaQhiLI9R8HH7tNQGnrIGH3FqUiTnnI2x";
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDummklvhgY_4KZn0z-9ndsI0hyvfL1aR4";
    
    if (!STABILITY_API_KEY) {
      throw new Error('STABILITY_API_KEY not configured in environment variables');
    }

    const { constellation = {}, context = {} } = req.body || {};
    const { traits = [] } = constellation;
    
    if (!traits.length) {
      throw new Error('매력을 최소 1개 이상 선택해주세요.');
    }

    // Step 1: Compose
    console.log('Step 1: Composing prompt...');
    const spec = composeLocal(constellation, context);
    let prompt = fillTemplate(spec);

    // Step 2: Optimize
    console.log('Step 2: Optimizing prompt...');
    prompt = await optimizePromptViaGemini(spec, prompt);

    // Step 3: Generate music
    console.log('Step 3: Generating music...');
    const fullPrompt = [
      prompt,
      spec.genres?.length ? `Genres: ${spec.genres.join(', ')}` : '',
      `Tempo: ${spec.tempo?.label} (${spec.tempo?.bpm} BPM)`,
      `Lead instrument: ${spec.instruments.lead}`,
      `Mood: ${spec.keywords.slice(0,3).join(', ')}`
    ].filter(Boolean).join('. ');

    // Use FormData for Stability AI
    const formData = new FormData();
    formData.append('prompt', fullPrompt);
    formData.append('duration', String(spec.duration_seconds || context.duration_seconds || 60));
    formData.append('output_format', 'mp3');
    formData.append('model', 'stable-audio-2.5');

    const response = await fetch(
      'https://api.stability.ai/v2beta/audio/stable-audio-2/text-to-audio',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          'Accept': 'audio/*'
        },
        body: formData
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Stability AI error: ${response.status} - ${errorText}`);
    }

    // Convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const audio_base64 = Buffer.from(arrayBuffer).toString('base64');
    const mime = response.headers.get('content-type') || 'audio/mp3';
    
    console.log(`Generation successful for IP ${clientIP}. No limits applied.`);
    
    res.json({ 
      audio_base64, 
      mime,
      spec,
      prompt,
      remaining: 999,
      used: 0
    });

  } catch (err) {
    const errorMessage = err.message || String(err);
    console.error("Generation error:", errorMessage);
    res.status(500).json({ error: errorMessage });
  }
}
