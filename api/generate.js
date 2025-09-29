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

// Load sound_map for categoryNoteLookup
const sound_map_data = {
  "sound_map": [
    {
      "category_name": "정서적안정및자기인식",
      "musical_note": "Do",
      "international_note": "C",
      "charms": [
        {"charm_name": "침착함", "keywords": ["Alto Flute (soft, breathy, short phrases)", "Calm", "Breathing"]},
        {"charm_name": "안정감", "keywords": ["Cello (long notes)", "Stable", "Sustained"]},
        {"charm_name": "자기성찰", "keywords": ["Ambient Synth Pad", "Introspective", "Spacious"]},
        {"charm_name": "긍정성", "keywords": ["Acoustic Guitar (Arpeggio)", "Hopeful", "Peaceful"]},
        {"charm_name": "현실감각", "keywords": ["Upright Bass (pizzicato, short decay)", "Grounded", "Foundation"]},
        {"charm_name": "자기객관화", "keywords": ["Muted Piano", "Clear", "Muted", "Reflective"]},
        {"charm_name": "자존감", "keywords": ["Warm Pad", "Self-love", "Enveloping"]},
        {"charm_name": "겸손", "keywords": ["Flugelhorn (soft)", "Humble", "Not too loud"]}
      ]
    },
    {
      "category_name": "성실성및책임감",
      "musical_note": "Re",
      "international_note": "D",
      "charms": [
        {"charm_name": "성실함", "keywords": ["Harpsichord", "Structured", "Precise"]},
        {"charm_name": "책임감", "keywords": ["Double Bass (pizzicato)", "Supportive", "Backbone"]},
        {"charm_name": "인내심", "keywords": ["Bassoon", "Patient", "Enduring"]},
        {"charm_name": "계획성", "keywords": ["Music Box", "Intricate", "Clockwork", "Planning"]},
        {"charm_name": "세심함", "keywords": ["Delicate Bells", "Detailed", "Careful", "Sparkling"]},
        {"charm_name": "신중함", "keywords": ["Clarinet (low register)", "Prudent", "Considered"]},
        {"charm_name": "절제력", "keywords": ["Minimalist Synth", "Controlled", "Restrained"]}
      ]
    },
    {
      "category_name": "이해심및공감능력",
      "musical_note": "Mi",
      "international_note": "E",
      "charms": [
        {"charm_name": "다정함", "keywords": ["Nylon String Guitar", "Gentle", "Affectionate"]},
        {"charm_name": "공감능력", "keywords": ["Viola", "Warm Vibrato", "Resonant"]},
        {"charm_name": "이해심", "keywords": ["Oboe", "Melancholy but Sweet", "Understanding"]},
        {"charm_name": "배려심", "keywords": ["Choir 'Oohs' Pad (wordless)", "Caring", "Enveloping"]},
        {"charm_name": "경청능력", "keywords": ["Handpan (soft touch)", "Listening", "Harmonious", "Open"]},
        {"charm_name": "위로능력", "keywords": ["Electric Piano (Rhodes)", "Comforting", "Cozy"]},
        {"charm_name": "섬세함", "keywords": ["Celesta", "Delicate", "Twinkling", "Considerate"]}
      ]
    },
    {
      "category_name": "유머감각및사교성",
      "musical_note": "La",
      "international_note": "A",
      "charms": [
        {"charm_name": "유머감각", "keywords": ["Pizzicato Strings", "Witty", "Bouncy", "Playful"]},
        {"charm_name": "분위기메이커", "keywords": ["Light Shaker & Bongo", "Groove", "Atmosphere"]},
        {"charm_name": "다양한친분", "keywords": ["Marimba", "Conversational", "Social", "Wooden"]},
        {"charm_name": "타인을편하게해주는능력", "keywords": ["Ukulele Strum", "Welcoming", "Friendly"]},
        {"charm_name": "관계를이어가는능력", "keywords": ["Mandolin Tremolo", "Connecting", "Shimmering"]},
        {"charm_name": "사교적에너지", "keywords": ["Clean Electric Guitar (Funk, muted plucks)", "Energetic", "Upbeat"]}
      ]
    },
    {
      "category_name": "도덕성및양심",
      "musical_note": "Sol",
      "international_note": "G",
      "charms": [
        {"charm_name": "정직함", "keywords": ["Glockenspiel", "Honest", "Clear", "Bright"]},
        {"charm_name": "양심", "keywords": ["Airy Choir Pad (wordless)", "Pure", "Conscience", "Innocent"]},
        {"charm_name": "일관성", "keywords": ["Soft Organ (8' stop)", "Consistent", "Noble", "Principled"]},
        {"charm_name": "원칙준수", "keywords": ["Harp", "Principled", "Orderly", "Elegant"]},
        {"charm_name": "진정성", "keywords": ["Sine Wave Synth", "Authentic", "Pure Tone"]},
        {"charm_name": "약자보호", "keywords": ["French Horn", "Protective", "Brave", "Knightly"]}
      ]
    },
    {
      "category_name": "지적호기심및개방성",
      "musical_note": "Fa",
      "international_note": "F",
      "charms": [
        {"charm_name": "호기심", "keywords": ["Sine Lead (portamento)", "Questioning", "Ethereal", "Exploring"]},
        {"charm_name": "창의성", "keywords": ["Synth Arpeggiator", "Creative", "Pattern", "Flowing"]},
        {"charm_name": "열린마음", "keywords": ["Ambient Textures", "Open", "Spacious", "Accepting"]},
        {"charm_name": "모험심", "keywords": ["Kalimba", "Adventurous", "Curious", "Exotic"]},
        {"charm_name": "비판적사고력", "keywords": ["Glitch SFX (short, subtle)", "Unconventional", "Deconstructed"]},
        {"charm_name": "통찰력", "keywords": ["Electric Piano (Wurlitzer)", "Insightful", "Jazzy"]},
        {"charm_name": "넓은시야", "keywords": ["String Pad", "Panoramic", "Broad", "Sweeping"]},
        {"charm_name": "집중력", "keywords": ["Percussive Vocal Chop (wordless, short)", "Focus", "Rhythmic", "Detail"]}
      ]
    },
    {
      "category_name": "목표지향성및야망",
      "musical_note": "Si",
      "international_note": "B",
      "charms": [
        {"charm_name": "목표의식", "keywords": ["Staccato Strings", "Focused", "Driving", "Cinematic"]},
        {"charm_name": "열정", "keywords": ["Overdriven E-Guitar (moderate gain, controlled sustain)", "Passionate", "Gritty"]},
        {"charm_name": "자기계발의지", "keywords": ["Synth Lead", "Developing", "Upward", "Progressive"]},
        {"charm_name": "리더십", "keywords": ["Brass Fanfare (short, bold)", "Leadership", "Commanding"]},
        {"charm_name": "야망", "keywords": ["Short Brass Stab", "Ambitious", "Epic", "Dramatic"]},
        {"charm_name": "경쟁심", "keywords": ["Snare (marching rimshot)", "Competitive", "Tension"]},
        {"charm_name": "전략적사고", "keywords": ["Short Timp Roll (soft mallets)", "Strategic", "Decisive", "Impact"]}
      ]
    }
  ]
};

function categoryNoteLookup(charmName) {
  for (const category of sound_map_data.sound_map) {
    for (const charm of category.charms) {
      if (charm.charm_name === charmName) {
        return {
          category: category.category_name,
          root: category.international_note,
          keywords: charm.keywords
        };
      }
    }
  }
  return { category: 'Unknown', root: 'C', keywords: ['Unknown'] };
}

// Improved composition logic (복잡한 로직 적용)
function composeLocal(constellation, context = {}) {
  const { traits = [] } = constellation;
  const durationSeconds = context.duration_seconds || 60;
  
  // Enrich traits with DB info
  const enrichedTraits = traits.map(trait => {
    const info = categoryNoteLookup(trait.charm_name);
    return {
      ...trait,
      category: info.category,
      root: info.root,
      keywords: info.keywords
    };
  });
  
  // Sort by stage (higher first)
  enrichedTraits.sort((a, b) => (parseInt(b.stage) || 1) - (parseInt(a.stage) || 1));
  
  const lead = enrichedTraits[0];
  const supports = enrichedTraits.slice(1, 3);
  const fx = enrichedTraits.slice(3, 5);
  const ambience = enrichedTraits.slice(5);
  
  // Generate core notes
  const coreNotes = [lead, ...supports]
    .map(t => t.root)
    .filter(Boolean)
    .filter((note, idx, arr) => arr.indexOf(note) === idx)
    .slice(0, 3);
  
  // Calculate tempo based on notes
  const noteToNumber = { C: 1, D: 2, E: 3, F: 4, G: 5, A: 6, B: 7 };
  const avgNote = enrichedTraits.reduce((sum, t) => sum + (noteToNumber[t.root] || 4), 0) / enrichedTraits.length;
  
  let tempo = { label: 'Moderato', bpm: 95 };
  if (avgNote <= 2.5) tempo = { label: 'Adagio', bpm: 65 };
  else if (avgNote >= 4.6) tempo = { label: 'Allegro', bpm: 125 };
  
  // Get instrument from lead trait
  const leadInstrument = lead?.keywords?.[0]?.split('(')[0]?.trim() || '피아노';
  
  return {
    duration_seconds: durationSeconds,
    roles: {
      lead: lead ? [lead] : [],
      support: supports,
      fx: fx,
      ambience: ambience
    },
    melody: {
      core_notes: coreNotes,
      notes_text: coreNotes.join(', '),
      rhythm_text: '안정적이고 걷는듯한 보통 빠르기의',
      rhythm_detail: '4분음표 중심의 리듬'
    },
    instruments: {
      lead: leadInstrument,
      support: ['현악기', '패드'],
      fx: ['벨']
    },
    genres: ['Ambient', 'Cinematic'],
    tempo,
    key: coreNotes[0] || 'C',
    time_signature: '4/4',
    keywords: enrichedTraits.flatMap(t => t.keywords).slice(0, 5),
    avoid: ['너무 강한', '시끄러운', '불안한']
  };
}

function fillTemplate(spec) {
  const { melody, instruments, tempo, keywords, duration_seconds } = spec;
  
  return `${duration_seconds}초 길이의 벨소리. 메인 멜로디는 ${instruments.lead}로 연주되며, 핵심 음은 ${melody?.notes_text || 'C, D, E'}입니다. The core notes of the melody should be ${melody?.core_notes?.join(', ') || 'C, D, E'}. 리듬은 ${melody?.rhythm_text || '안정적이고 걷는듯한 보통 빠르기의'} 특징을 보입니다. 템포는 ${tempo.label} 약 ${tempo.bpm} BPM입니다. 전체적인 분위기는 ${keywords.slice(0, 3).join(', ')}입니다.`;
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
