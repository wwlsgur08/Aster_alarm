import { compose as composeLocal } from './analyze.js';
import { fillTemplate } from './templates.js';

async function loadDB() {
  const res = await fetch('../data/sound_map.json');
  if (!res.ok) throw new Error('sound_map.json 로드 실패');
  return res.json();
}

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => c && e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return e;
}

function clampStage(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return Math.min(6, Math.max(1, Math.round(n)));
}

function buildTraitRow(value = { charm_name: '', stage: '' }, onRemove, openPicker) {
  const row = el('div', { class: 'trait-row' });
  const name = el('input', { placeholder: '매력 선택', value: value.charm_name || '', readonly: 'readonly' });
  const stage = el('input', { type: 'number', placeholder: '단계(1~6)', value: value.stage ?? '', min: '1', max: '6', step: '1' });
  const pick = el('button', { type: 'button' }, '매력 선택');
  const del = el('button', { type: 'button' }, '삭제');
  del.addEventListener('click', () => onRemove(row));
  pick.addEventListener('click', () => openPicker((chosenName) => { name.value = chosenName; }));
  row.append(name, stage, pick, del);
  return { row, get: () => ({ charm_name: name.value.trim(), stage: clampStage(stage.value) }), set: (v) => { name.value = v.charm_name || ''; stage.value = v.stage ?? ''; } };
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function copy(text) { navigator.clipboard?.writeText(text); }

function systemPromptForOptimize() {
  return (
    '당신은 한국어 음악 프롬프트 에디터입니다. ' +
    '아래 스펙과 초안 프롬프트를 참고하여, 음악 생성 모델에 적합하도록 한국어 프롬프트를 다듬고 더 자연스럽게 개선하세요. ' +
    '의미(길이, 템포, 역할, 핵심 음 등)는 유지하고, 불필요한 중복을 제거하세요. ' +
    '반환은 한국어 최종 프롬프트 텍스트만, 코드블록/JSON 없이 한글 문장으로만 출력하세요.'
  );
}

async function optimizePromptViaAiStudio({ key, model, spec, prompt }) {
  const sys = systemPromptForOptimize();
  const tryCall = async (modelName) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(key)}`;
    const body = {
      system_instruction: { role: 'system', parts: [{ text: sys }] },
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
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res;
  };

  const primaryModel = (model || 'gemini-2.5-pro').trim();
  let res = await tryCall(primaryModel);
  if (!res.ok) {
    // Read error once for diagnostics
    let errText = '';
    try { errText = await res.text(); } catch {}
    console.error('Gemini optimize failed', { status: res.status, errText });

    // Fallback: if 2.5 계열이 없거나 접근 불가일 때 1.5-pro로 재시도
    const fallbackModel = 'gemini-1.5-pro';
    if (primaryModel !== fallbackModel && (res.status === 404 || /not found|model/i.test(errText))) {
      console.warn(`Retrying optimize with fallback model: ${fallbackModel}`);
      res = await tryCall(fallbackModel);
      if (!res.ok) {
        let errText2 = '';
        try { errText2 = await res.text(); } catch {}
        throw new Error(`Gemini 최적화 호출 실패 (fallback 포함): ${res.status} ${errText2 || errText}`);
      }
    } else {
      throw new Error(`Gemini 최적화 호출 실패: ${res.status} ${errText}`);
    }
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const outText = parts.map(p => p.text || '').join('\n');
  return outText.replace(/```[a-z]*|```/g, '').trim();
}

async function main() {
  const db = await loadDB();

  const traitsContainer = document.getElementById('traits-container');
  const addBtn = document.getElementById('add-trait');
  const clearBtn = document.getElementById('clear-traits');
  const traitsJson = document.getElementById('traits-json');
  const loadJsonBtn = document.getElementById('load-json');
  const exportJsonBtn = document.getElementById('export-json');
  const durationSelect = document.getElementById('duration_select');
  const apiEndpoint = document.getElementById('api-endpoint');
  const generateBtn = document.getElementById('generate');
  const status = document.getElementById('gen-status');
  const specOut = document.getElementById('spec-output'); // (없어도 무관)
  const promptOut = document.getElementById('prompt-output'); // (없어도 무관)

  // Defaults
  const defaultGenerate = 'http://localhost:8080/generate';
  if (apiEndpoint && !apiEndpoint.value) apiEndpoint.value = defaultGenerate;

  // Settings
  const geminiKeyInput = document.getElementById('gemini-api-key');
  const geminiModelInput = document.getElementById('gemini-model');
  const saveSettings = document.getElementById('save-settings');
  // load saved
  try {
    const savedKey = localStorage.getItem('aster_gemini_api_key') || '';
    const savedModel = localStorage.getItem('aster_gemini_model') || 'gemini-2.5-pro';
    if (geminiKeyInput && !geminiKeyInput.value) geminiKeyInput.value = savedKey;
    if (geminiModelInput && !geminiModelInput.value) geminiModelInput.value = savedModel;
  } catch {}
  saveSettings?.addEventListener('click', () => {
    try {
      localStorage.setItem('aster_gemini_api_key', geminiKeyInput?.value || '');
      localStorage.setItem('aster_gemini_model', geminiModelInput?.value || 'gemini-2.5-pro');
      alert('설정이 저장되었습니다.');
    } catch {}
  });

  // Picker modal
  const picker = document.getElementById('picker');
  const pickerClose = document.getElementById('picker-close');
  const pickerCategories = document.getElementById('picker-categories');
  const pickerCharms = document.getElementById('picker-charms');

  let onChooseCharm = null;
  function closePicker() {
    picker.classList.add('hidden');
    picker.setAttribute('aria-hidden', 'true');
    onChooseCharm = null;
    pickerCharms.innerHTML = '<div class="hint">카테고리를 클릭하면 세부 매력이 표시됩니다.</div>';
  }
  function showCategory(cat, itemEl) {
    Array.from(pickerCategories.children).forEach(c => c.classList.remove('active'));
    itemEl?.classList.add('active');
    pickerCharms.innerHTML = '';
    (cat.charms || []).forEach(ch => {
      const chip = el('div', { class: 'charm', title: (ch.keywords || []).join(', ') }, ch.charm_name);
      chip.addEventListener('click', () => { if (onChooseCharm) { onChooseCharm(ch.charm_name); closePicker(); } });
      pickerCharms.appendChild(chip);
    });
    if (!cat.charms || !cat.charms.length) pickerCharms.innerHTML = '<div class="hint">등록된 세부 매력이 없습니다.</div>';
  }
  function openPicker(cb) {
    onChooseCharm = cb;
    picker.classList.remove('hidden');
    picker.setAttribute('aria-hidden', 'false');
    const first = pickerCategories.querySelector('.picker-category');
    first?.click();
  }
  pickerClose.addEventListener('click', closePicker);
  picker.addEventListener('click', (e) => { if (e.target === picker) closePicker(); });

  // Build categories (click to switch)
  pickerCategories.innerHTML = '';
  (db.sound_map || []).forEach(cat => {
    const item = el('div', { class: 'picker-category' }, [
      el('div', { class: 'title', text: cat.category_name }),
      el('div', { class: 'note', text: `${cat.musical_note} / ${cat.international_note}` })
    ]);
    item.addEventListener('click', () => showCategory(cat, item));
    pickerCategories.appendChild(item);
  });

  // Rows
  const rows = [];
  function addRow(pref) {
    const { row, get, set } = buildTraitRow(pref, (r) => {
      traitsContainer.removeChild(r);
      const idx = rows.findIndex(x => x.row === r);
      if (idx >= 0) rows.splice(idx, 1);
    }, openPicker);
    rows.push({ row, get, set });
    traitsContainer.appendChild(row);
    if (!pref) openPicker((chosenName) => { try { set({ charm_name: chosenName, stage: '' }); } catch {} });
  }
  function clearRows() { rows.splice(0, rows.length); traitsContainer.innerHTML = ''; }

  addBtn.addEventListener('click', () => addRow());
  clearBtn.addEventListener('click', () => clearRows());

  loadJsonBtn.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(traitsJson.value || '{}');
      clearRows();
      (parsed.traits || []).forEach(t => addRow(t));
    } catch (e) { alert('JSON 파싱 실패'); }
  });
  exportJsonBtn.addEventListener('click', () => {
    const traits = rows.map(r => r.get()).filter(t => t.charm_name);
    const payload = { traits };
    traitsJson.value = JSON.stringify(payload, null, 2);
  });

  function updateGenerateDisabled() {
    const key = geminiKeyInput?.value?.trim();
    const hasKey = Boolean(key);
    const hasGen = Boolean((apiEndpoint?.value || '').trim());
    generateBtn.disabled = !(hasKey && hasGen);
  }
  geminiKeyInput?.addEventListener('input', updateGenerateDisabled);
  apiEndpoint?.addEventListener('input', updateGenerateDisabled);
  updateGenerateDisabled();

  // Single-click: local compose -> Gemini optimize -> music generate
  generateBtn.addEventListener('click', async () => {
    try {
      const key = geminiKeyInput?.value?.trim();
      const model = geminiModelInput?.value?.trim() || 'gemini-2.5-pro';
      const generateUrl = (apiEndpoint?.value || '').trim();
      if (!key) throw new Error('Gemini API 키가 필요합니다. 설정에서 입력하세요.');
      if (!generateUrl) throw new Error('음악 생성 엔드포인트가 비었습니다.');

      const constellation = { traits: rows.map(r => r.get()).filter(t => t.charm_name) };
      const context = {
        duration_seconds: Number(durationSelect.value || 30)
      };

      status.textContent = '로컬 프롬프트 생성 중...';
      const spec = composeLocal(constellation, context, {}, db);
      let prompt = fillTemplate(spec);
      if (specOut) specOut.value = JSON.stringify(spec, null, 2);
      if (promptOut) promptOut.value = prompt;

      status.textContent = 'Gemini 프롬프트 최적화 중...';
      const optimized = await optimizePromptViaAiStudio({ key, model, spec, prompt });
      prompt = optimized || prompt;
      if (promptOut) promptOut.value = prompt;

      status.textContent = '음악 생성 중...';
      const genRes = await fetch(generateUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spec, prompt }) });
      if (!genRes.ok) throw new Error('음악 생성 프록시 응답 오류');
      const data = await genRes.json();
      if (!data.audio_base64) throw new Error('오디오가 없습니다.');

      const a = document.createElement('a');
      a.href = `data:${data.mime || 'audio/wav'};base64,${data.audio_base64}`;
      a.download = 'aster_alarm.wav';
      a.click();
      status.textContent = '다운로드 완료';
    } catch (e) {
      status.textContent = '실패: ' + (e.message || e);
    }
  });

  // Seed with two empty rows by default
  addRow();
  addRow();
}

main().catch(err => alert(err.message || err));
