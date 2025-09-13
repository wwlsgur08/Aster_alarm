const MAJOR_TRIADS = {
  C: ["C", "E", "G"],
  D: ["D", "F#", "A"],
  E: ["E", "G#", "B"],
  F: ["F", "A", "C"],
  G: ["G", "B", "D"],
  A: ["A", "C#", "E"],
  B: ["B", "D#", "F#"],
};

const NOTE_TO_MIDI = {
  C: 60, "C#": 61, Db: 61,
  D: 62, "D#": 63, Eb: 63,
  E: 64,
  F: 65, "F#": 66, Gb: 66,
  G: 67, "G#": 68, Ab: 68,
  A: 69, "A#": 70, Bb: 70,
  B: 71,
};

const NOTE_PRIORITY = { C: 1, D: 2, E: 3, F: 4, G: 5, A: 6, B: 7 };
const NOTE_TO_DEGREE = { C: 1, D: 2, E: 3, F: 4, G: 5, A: 6, B: 7 };
const DYNAMIC_MAP = { 1: 'pp', 2: 'p', 3: 'mp', 4: 'mf', 5: 'f', 6: 'ff' };

function mapStageToDynamic(stage) {
  return DYNAMIC_MAP[stage] || 'mp';
}

function calculateDynamics(traits, leadTrait) {
  if (!traits || traits.length === 0) {
    return { s_low: 3, s_high: 4 }; // Default to mp/mf
  }

  const histogram = traits.reduce((acc, trait) => {
    const stage = trait.stage;
    if (stage) {
      acc[stage] = (acc[stage] || 0) + 1;
    }
    return acc;
  }, {});

  const sortedStages = Object.entries(histogram).sort((a, b) => {
    const countDiff = b[1] - a[1];
    if (countDiff !== 0) return countDiff;

    const leadStage = leadTrait?.stage;
    if (a[0] == leadStage) return -1;
    if (b[0] == leadStage) return 1;

    return b[0] - a[0];
  });

  const s1 = sortedStages[0] ? parseInt(sortedStages[0][0], 10) : 3;
  const s2 = sortedStages[1] ? parseInt(sortedStages[1][0], 10) : s1;

  return {
    s_low: Math.min(s1, s2),
    s_high: Math.max(s1, s2),
  };
}


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

function tempoFromAverageScaleDegree(rootsAll) {
  const degrees = rootsAll.map(r => NOTE_TO_DEGREE[r]).filter(v => typeof v === 'number');
  const avg = degrees.length ? (degrees.reduce((a, b) => a + b, 0) / degrees.length) : 4; // default to Moderato

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

export function compose(constellation, context, musicPrefs, db) {
  const raw = constellation?.traits || [];
  if (!raw.length) throw new Error('constellation.traits 가 비어 있습니다.');

  const enriched = raw.map((t, idx) => {
    const name = t.charm_name || t.name;
    const stage = t.stage != null ? Number(t.stage) : 1;
    const info = findCharm(db, name);
    const { instrument, moods } = extractInstrumentAndMoods(info.keywords);
    return { idx, name, stage, category: info.category, root: info.root, instrument, moods };
  });

  enriched.sort((a,b) => {
    const s = (b.stage || 0) - (a.stage || 0);
    if (s !== 0) return s;
    const ap = NOTE_PRIORITY[a.root] || 0;
    const bp = NOTE_PRIORITY[b.root] || 0;
    const p = bp - ap;
    if (p !== 0) return p;
    return a.idx - b.idx;
  });

  const lead = enriched[0];
  const support = enriched.slice(1,3);
  const fx = enriched.slice(3,5);

  // --- NEW LOGIC ---

  // 1. DYNAMICS
  const dynamicTraits = [lead, ...support, ...fx].filter(Boolean);
  const { s_low, s_high } = calculateDynamics(dynamicTraits, lead);

  // 2. RHYTHM
  const rhythmTraits = [lead, ...support];
  const stages = rhythmTraits.map(t => t?.stage).filter(s => s != null && s > 0);
  const avgStage = stages.length ? stages.reduce((a, b) => a + b, 0) / stages.length : 1;
  const representativeStage = Math.round(avgStage);
  const rhythm = rhythmFromStageDetailed(representativeStage);

  // 3. TEMPO
  const allRoots = enriched.map(x => x.root).filter(Boolean);
  let { bpm, label: tempoLabel } = tempoFromAverageScaleDegree(allRoots);

  // 4. DURATION-SPECIFIC MODE
  const is30sMode = (context?.duration_seconds || 60) <= 30;
  let form_prompt, instrumentation_prompt, mix_prompt, harmony_prompt, dynamics_prompt, constraints_prompt;

  if (is30sMode) {
    form_prompt = "A-A'-B-A form (approx. 8-12 bars), single clear motif with slight variation, loop-compatible.";
    instrumentation_prompt = "2-3 layers max (Lead + thin Pad/Arp + very subtle FX). Lead instrument should have a clear, fast attack (e.g., Glockenspiel, Celesta, Sine Bell, Marimba).";
    mix_prompt = "Short reverb, short decay tail, focused on mid-high frequencies, mono-compatible narrow stereo image.";
    harmony_prompt = "Simple 2-4 chord loop (e.g., I-V-vi-IV progression), no complex voicings or modulation.";
    constraints_prompt = "no lyrics, no heavy kick drum, no long reverb.";

    if (bpm < 96) bpm = 96;
    if (bpm > 116) bpm = 116;
    tempoLabel = "Andantino-Allegretto";

    const capped_s_high = Math.min(s_high, 4); // Cap at mf
    dynamics_prompt = `Consistent dynamics at ${mapStageToDynamic(s_low)}, with one brief accent to ${mapStageToDynamic(capped_s_high)}. No drastic volume changes.`;
  } else { // 60s Mode
    form_prompt = "A-A'-B-A or AABA form (approx. 16-32 bars), with gradual development. 0-15s intro, 15-45s development with soft climax, 45-60s outro with loop-friendly tail.";
    instrumentation_prompt = "3-5 layers (Lead + Warm Pad/Soft Strings + Light Arpeggiator + subtle FX). Starts thin, builds in the middle section.";
    mix_prompt = "Medium reverb, wider stereo image, soft compression (1.5:1 to 2:1 ratio).";
    harmony_prompt = "4-8 bar chord progression, with slightly different voicings or a counter-melody in the B section.";
    constraints_prompt = "no lyrics, instrumental only.";
    
    const capped_s_high = Math.min(s_high, 5); // Cap at f
    dynamics_prompt = `Starts at ${mapStageToDynamic(s_low)}, gradual crescendo to ${mapStageToDynamic(capped_s_high)} by 0:35, brief peak, then decrescendo to ${mapStageToDynamic(s_low)} for the tail.`;
  }

  // 5. FINAL SPEC ASSEMBLY
  const leadInstrument = lead?.instrument || 'felt piano';
  const coreNotes = [...new Set([lead?.root, ...support.map(s => s.root)].filter(Boolean))].slice(0,3);
  const genres = inferGenres([leadInstrument, ...support.map(s=>s.instrument)], enriched.flatMap(x=>x.moods));

  const spec = {
    duration_seconds: context?.duration_seconds,
    
    identity_prompt: `Lead is ${leadInstrument}: ${lead.moods.join(', ')}.`,
    core_notes_prompt: `The core notes of the melody should be ${coreNotes.join(', ')}.`,
    
    form_prompt: form_prompt,
    instrumentation_prompt: instrumentation_prompt,
    mix_prompt: mix_prompt,
    harmony_prompt: harmony_prompt,
    
    rhythm_tempo_prompt: `${rhythm.en}; ${tempoLabel}, ~${bpm} BPM.`,
    dynamics_prompt: dynamics_prompt,
    constraints_prompt: constraints_prompt,
    
    // Raw data for reference in final template if needed
    genres: genres,
    keywords: [...new Set(enriched.flatMap(x => x?.moods || []))].slice(0,6),
    avoid: ['sad', 'melancholic'],
  };

  return spec;
}