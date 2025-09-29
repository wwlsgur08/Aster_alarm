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

// Load actual sound_map from server data (정확한 데이터 사용)
const sound_map_data = {
  "sound_map": [
    {
      "category_name": "정서적 안정 및 자기 인식",
      "musical_note": "Do",
      "international_note": "C",
      "charms": [
        {"charm_name": "침착함", "keywords": ["Low Flute", "Calm", "Breathing"]},
        {"charm_name": "안정감", "keywords": ["Cello (long notes)", "Stable", "Sustained"]},
        {"charm_name": "자기성찰", "keywords": ["Ambient Synth Pad", "Introspective", "Spacious"]},
        {"charm_name": "긍정성", "keywords": ["Acoustic Guitar (Arpeggio)", "Hopeful", "Peaceful"]},
        {"charm_name": "현실감각", "keywords": ["Upright Bass (arco)", "Grounded", "Foundation"]},
        {"charm_name": "자기객관화", "keywords": ["Muted Piano", "Clear", "Muted", "Reflective"]},
        {"charm_name": "자존감", "keywords": ["Warm Pad", "Self-love", "Enveloping"]},
        {"charm_name": "겸손", "keywords": ["Muted Trumpet", "Humble", "Not too loud"]}
      ]
    },
    {
      "category_name": "성실성 및 책임감",
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
      "category_name": "이해심 및 공감 능력",
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
      "category_name": "유머 감각 및 사교성",
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
      "category_name": "도덕성 및 양심",
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
      "category_name": "지적 호기심 및 개방성",
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
      "category_name": "목표 지향성 및 야망",
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

// 웹 클라이언트와 완전히 동일한 분석 시스템 복사
function findCharm(db, charmName) {
  for (const cat of db.sound_map || []) {
    for (const c of cat.charms || []) {
      if (c.charm_name === charmName) {
        return { category: cat.category_name, root: cat.international_note, keywords: c.keywords || [] };
      }
    }
  }
  return { category: null, root: null, keywords: [] };
}

function extractInstrumentAndMoods(keywords) {
  if (!keywords || !keywords.length) return { instrument: null, moods: [] };
  const [instrument, ...moods] = keywords;
  return { instrument, moods };
}

function rhythmFromStageDetailed(stage) {
  const n = Math.max(1, Math.min(6, Math.round(Number(stage || 1))));
  switch (n) {
    case 1:
    case 2:
      return {
        ko: '8분음표 중심의 짧고 경쾌한 리듬',
        en: 'eighth-note based, short and lively rhythm',
        kw: '짧고 리드미컬하며 경쾌한',
      };
    case 3:
    case 4:
      return {
        ko: '4분음표 중심의 안정적인 리듬',
        en: 'quarter-note centered, stable rhythm',
        kw: '안정적이고 걷는듯한 보통 빠르기의',
      };
    case 5:
      return {
        ko: '점4분음표 중심의 여유로운 리듬',
        en: 'dotted quarter-note centered, unhurried rhythm',
        kw: '길고 여유로우며 서정적인 호흡의',
      };
    case 6:
    default:
      return {
        ko: '2분음표 중심의 더 긴 호흡의 리듬',
        en: 'half-note centered, with a longer breath',
        kw: '길고 여유로우며 서정적인 호흡의',
      };
  }
}

const NOTE_TO_DEGREE = { C: 1, D: 2, E: 3, F: 4, G: 5, A: 6, B: 7 };
const NOTE_PRIORITY = { C: 1, D: 2, E: 3, F: 4, G: 5, A: 6, B: 7 };

function tempoFromAverageScaleDegree(rootsAll) {
  const degrees = rootsAll.map(r => NOTE_TO_DEGREE[r]).filter(v => typeof v === 'number');
  const avg = degrees.length ? (degrees.reduce((a, b) => a + b, 0) / degrees.length) : 4;

  if (avg < 2.0) return { bpm: 65, label: 'Adagio' };
  if (avg < 3.0) return { bpm: 84, label: 'Andante' };
  if (avg < 4.0) return { bpm: 96, label: 'Andantino' };
  if (avg < 5.0) return { bpm: 108, label: 'Moderato' };
  if (avg < 6.0) return { bpm: 116, label: 'Allegretto' };
  return { bpm: 128, label: 'Allegro' };
}

function inferGenres(instruments, moodKeywords) {
  const text = [ ...(instruments || []), ...(moodKeywords || []) ].join(' ').toLowerCase();
  const out = [];
  if (["piano","guitar","nylon","rhodes","wurlitzer","lofi"].some(k => text.includes(k))) out.push('lofi');
  if (["orchestral","horn","strings","cinematic","timpani","fanfare"].some(k => text.includes(k))) out.push('cinematic');
  if (["synth","ambient","pad","theremin","arpeggiator"].some(k => text.includes(k))) out.push('ambient');
  if (!out.length) return ['lofi','ambient'];
  return out.slice(0,3);
}

// 웹 클라이언트와 완전히 동일한 compose 함수
function composeLocal(constellation, context = {}) {
  const raw = constellation?.traits || [];
  if (!raw.length) throw new Error('constellation.traits 가 비어 있습니다.');

  const enriched = raw.map((t, idx) => {
    const name = t.charm_name || t.name;
    const stage = t.stage != null ? Number(t.stage) : 1;
    const info = findCharm(sound_map_data, name);
    const { instrument, moods } = extractInstrumentAndMoods(info.keywords);
    return { idx, name, stage, category: info.category, root: info.root, instrument, moods };
  });

  enriched.sort((a,b) => {
    const s = (b.stage || 0) - (a.stage || 0);
    if (s !== 0) return s;
    const ap = NOTE_PRIORITY[a.root] || 0;
    const bp = NOTE_PRIORITY[b.root] || 0;
    return bp - ap;
  });

  const lead = enriched[0];
  const support = enriched.slice(1, 3);
  const fx = enriched.slice(3, 5);
  const ambience = enriched.slice(5);

  const rhythm = rhythmFromStageDetailed(lead?.stage || 1);
  const rootsAll = enriched.map(x => x.root).filter(Boolean);
  const tempo = tempoFromAverageScaleDegree(rootsAll);

  const leadInstrument = lead?.instrument || 'felt piano';
  const coreNotes = [...new Set([lead?.root, ...support.map(s => s.root)].filter(Boolean))].slice(0,3);
  const genres = inferGenres([leadInstrument, ...support.map(s=>s.instrument)], enriched.flatMap(x=>x.moods));

  return {
    duration_seconds: context?.duration_seconds || 60,
    
    roles: {
      lead: lead ? [lead] : [],
      support: support,
      fx: fx,
      ambience: ambience
    },
    melody: {
      core_notes: coreNotes,
      notes_text: coreNotes.join(', '),
      rhythm_text: rhythm.kw,
      rhythm_detail: rhythm.ko
    },
    instruments: {
      lead: leadInstrument,
      support: support.map(s => s.instrument).filter(Boolean) || ['현악기', '패드'],
      fx: fx.map(f => f.instrument).filter(Boolean) || ['벨']
    },
    genres: genres,
    tempo: tempo,
    key: coreNotes[0] || 'C',
    time_signature: '4/4',
    keywords: [...new Set(enriched.flatMap(x => x?.moods || []))].slice(0,6),
    avoid: ['sad', 'melancholic']
  };
}

function fillTemplate(spec) {
  const { melody, instruments, tempo, keywords, duration_seconds, roles } = spec;
  
  // Get trait names for context
  const allTraits = [
    ...(roles?.lead || []),
    ...(roles?.support || []),
    ...(roles?.fx || []),
    ...(roles?.ambience || [])
  ];
  const traitNames = allTraits.map(t => t.charm_name).filter(Boolean).join(', ');
  
  // Build comprehensive prompt
  let promptParts = [
    `${duration_seconds}초 길이의 개인 맞춤 벨소리`,
    `메인 멜로디는 ${instruments.lead}로 연주`,
    `핵심 음계: ${melody?.notes_text || 'C, D, E'}`,
    `The core notes should be ${melody?.core_notes?.join(', ') || 'C, D, E'}`,
    `리듬: ${melody?.rhythm_text || '안정적이고 걷는듯한 보통 빠르기'}`,
    `템포: ${tempo.label} (${tempo.bpm} BPM)`,
    `조성: ${spec.key || 'C'} major`,
    `박자: ${spec.time_signature || '4/4'}`
  ];
  
  if (traitNames) {
    promptParts.push(`개성: ${traitNames} 특성 반영`);
  }
  
  if (keywords && keywords.length > 0) {
    promptParts.push(`분위기: ${keywords.slice(0, 4).join(', ')}`);
  }
  
  if (spec.avoid && spec.avoid.length > 0) {
    promptParts.push(`주의사항: ${spec.avoid.join(', ')} 요소 제외`);
  }
  
  return promptParts.join('. ') + '.';
}

async function optimizePromptViaGemini(spec, prompt) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDummklvhgY_4KZn0z-9ndsI0hyvfL1aR4";
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set, skipping optimization');
    return prompt;
  }

  try {
    const systemPrompt = `당신은 한국어 음악 프롬프트 에디터입니다. 
아래 스펙과 초안 프롬프트를 참고하여, 음악 생성 모델에 적합하도록 한국어 프롬프트를 다듬고 더 자연스럽게 개선하세요. 
의미(길이, 템포, 역할, 핵심 음, 악기 등)는 반드시 유지하고, 불필요한 중복을 제거하세요. 
벨소리로 적합하도록 맑고 깨끗한 음질을 강조하세요.
반환은 한국어 최종 프롬프트 텍스트만, 코드블록/JSON 없이 한글 문장으로만 출력하세요.`;

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
    
    // Build comprehensive prompt with genres and additional context
    const fullPrompt = [
      prompt,
      spec.genres?.length ? `장르: ${spec.genres.join(', ')}` : '',
      `악기 구성: 메인 ${spec.instruments.lead}, 서포트 ${spec.instruments.support?.join('/')}`,
      spec.roles?.lead?.length ? `주도 특성: ${spec.roles.lead.map(t => t.charm_name).join(', ')}` : '',
      spec.roles?.support?.length ? `보조 특성: ${spec.roles.support.map(t => t.charm_name).join(', ')}` : '',
      'high quality, clear, professional ringtone',
      'well-balanced mix, pleasant for phone notifications'
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
