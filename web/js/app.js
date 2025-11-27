import { compose as composeLocal } from './analyze.js';
import { fillTemplate } from './templates.js';

async function loadDB() {
  const res = await fetch('./sound_map.json');
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
  return Math.min(6, Math.max(1, Math.round(n))); // 1~6 범위로 변경
}

function buildTraitRow(value = { charm_name: '', stage: '' }, onRemove, openPicker) {
  const row = el('div', { class: 'charm-row' });

  const charmBtn = el('button', {
    class: `charm-button ${!value.charm_name ? 'placeholder' : ''}`,
    type: 'button'
  }, value.charm_name || '매력 선택');

  // 1~6 단계 버튼 그룹
  const stageContainer = el('div', {
    class: `stage-buttons ${!value.charm_name ? 'disabled' : ''}`
  });

  const stageButtons = [];
  for (let i = 1; i <= 6; i++) {
    const btn = el('button', {
      type: 'button',
      class: 'stage-btn',
      'data-value': String(i)
    }, String(i));
    btn.addEventListener('click', () => {
      if (stageContainer.classList.contains('disabled')) return;
      stageButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    stageButtons.push(btn);
    stageContainer.appendChild(btn);
  }

  // 초기 선택 상태 적용
  const initStage = clampStage(value.stage);
  if (initStage) {
    const target = stageButtons[initStage - 1];
    target?.classList.add('selected');
  }

  const removeBtn = el('button', {
    class: 'remove-charm-btn',
    type: 'button',
    title: '삭제'
  }, '×');

  charmBtn.addEventListener('click', () => {
    openPicker((chosenName) => {
      charmBtn.textContent = chosenName;
      charmBtn.classList.remove('placeholder');
      stageContainer.classList.remove('disabled');
    });
  });

  removeBtn.addEventListener('click', () => onRemove(row));

  row.append(charmBtn, stageContainer, removeBtn);

  const getSelectedStage = () => {
    const sel = stageButtons.find(b => b.classList.contains('selected'));
    const val = sel ? Number(sel.getAttribute('data-value')) : NaN;
    return Number.isFinite(val) ? clampStage(val) : '';
  };

  const setSelectedStage = (v) => {
    const n = clampStage(v);
    stageButtons.forEach(b => b.classList.remove('selected'));
    if (n) stageButtons[n - 1]?.classList.add('selected');
  };

  return {
    row,
    get: () => ({
      charm_name: charmBtn.textContent === '매력 선택' ? '' : charmBtn.textContent.trim(),
      stage: getSelectedStage()
    }),
    set: (v) => {
      charmBtn.textContent = v.charm_name || '매력 선택';
      const hasCharm = Boolean(v.charm_name);
      charmBtn.classList.toggle('placeholder', !hasCharm);
      stageContainer.classList.toggle('disabled', !hasCharm);
      setSelectedStage(v.stage ?? '');
    }
  };
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function initMusicPlayer() {
  const audio = document.getElementById('audio-player');
  const playBtn = document.getElementById('play-btn');
  const downloadBtn = document.getElementById('download-btn');
  const progressBar = document.getElementById('progress-bar');
  const progressFill = document.getElementById('progress-fill');
  const currentTime = document.getElementById('current-time');
  const totalTime = document.getElementById('total-time');
  const trackTitle = document.getElementById('track-title');
  const trackSubtitle = document.getElementById('track-subtitle');
  const playIcon = playBtn.querySelector('.play-icon');
  const cdImage = document.getElementById('cd-image');
  
  let audioData = null;
  let fileName = 'aster_alarm.wav';
  
  // 오디오 로드
  function loadAudio(base64Data, mimeType = 'audio/wav', title = '생성된 음악') {
    audioData = { base64Data, mimeType };
    fileName = title + '.wav';
    
    const audioUrl = `data:${mimeType};base64,${base64Data}`;
    audio.src = audioUrl;
    
    // UI 업데이트
    trackTitle.textContent = `🎵 ${title}`;
    trackSubtitle.textContent = '재생 버튼을 눌러 음악을 들어보세요';
    
    // 버튼 활성화
    playBtn.disabled = false;
    downloadBtn.disabled = false;
    
    // 메타데이터 로드 시 시간 업데이트
    audio.addEventListener('loadedmetadata', () => {
      totalTime.textContent = formatTime(audio.duration);
    });
    
    audio.load();
  }
  
  // 재생/일시정지 토글
  function togglePlay() {
    if (audio.paused) {
      audio.play();
      playIcon.textContent = '⏸';
      playBtn.classList.add('playing');
      cdImage.classList.add('spinning');
    } else {
      audio.pause();
      playIcon.textContent = '▶';
      playBtn.classList.remove('playing');
      cdImage.classList.remove('spinning');
    }
  }
  
  // 다운로드
  function downloadAudio() {
    if (!audioData) return;
    
    const a = document.createElement('a');
    a.href = `data:${audioData.mimeType};base64,${audioData.base64Data}`;
    a.download = fileName;
    a.click();
  }
  
  // 프로그레스 바 클릭으로 위치 이동
  function seekTo(event) {
    if (!audio.duration) return;
    
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * audio.duration;
    
    audio.currentTime = newTime;
  }
  
  // 이벤트 리스너
  playBtn.addEventListener('click', togglePlay);
  downloadBtn.addEventListener('click', downloadAudio);
  progressBar.addEventListener('click', seekTo);
  
  // 오디오 이벤트
  audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
      const percentage = (audio.currentTime / audio.duration) * 100;
      progressFill.style.width = `${percentage}%`;
      currentTime.textContent = formatTime(audio.currentTime);
    }
  });
  
  audio.addEventListener('ended', () => {
    playIcon.textContent = '▶';
    playBtn.classList.remove('playing');
    cdImage.classList.remove('spinning');
    progressFill.style.width = '0%';
    audio.currentTime = 0;
  });
  
  audio.addEventListener('error', () => {
    trackTitle.textContent = '🎵 오디오 로드 오류';
    trackSubtitle.textContent = '음악을 재생할 수 없습니다';
    playBtn.disabled = true;
    cdImage.classList.remove('spinning');
  });
  
  return { loadAudio };
}

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

  // 음악 플레이어 초기화
  const musicPlayer = initMusicPlayer();

  // 스크롤 인디케이터 자동 숨김
  const scrollIndicator = document.querySelector('.scroll-indicator');
  let hasScrolled = false;
  
  window.addEventListener('scroll', () => {
    if (!hasScrolled && window.scrollY > 50) {
      hasScrolled = true;
      if (scrollIndicator) {
        scrollIndicator.style.opacity = '0';
        scrollIndicator.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
          scrollIndicator.style.display = 'none';
        }, 500);
      }
    }
  });

  const traitsContainer = document.getElementById('traits-container');
  const addBtn = document.getElementById('add-trait');
  const clearBtn = document.getElementById('clear-traits');
  const traitsJson = document.getElementById('traits-json');
  const loadJsonBtn = document.getElementById('load-json');
  const exportJsonBtn = document.getElementById('export-json');
  const durationSelect = document.getElementById('duration_select');
  const durationDisplay = document.getElementById('duration-display');
  const apiEndpoint = document.getElementById('api-endpoint');
  const generateBtn = document.getElementById('generate');
  const status = document.getElementById('gen-status');
  const specOut = document.getElementById('spec-output'); // (없어도 무관)
  const promptOut = document.getElementById('prompt-output'); // (없어도 무관)

  // 시간 슬라이더 업데이트 함수
  function updateDurationDisplay() {
    const seconds = parseInt(durationSelect.value);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    durationDisplay.textContent = `${minutes}분 ${remainingSeconds.toString().padStart(2, '0')}초`;
  }

  // 시간 슬라이더 이벤트 리스너
  durationSelect.addEventListener('input', updateDurationDisplay);
  updateDurationDisplay(); // 초기 표시

  // Defaults - use relative path for Vercel deployment
  const defaultGenerate = '/api/generate';
  if (apiEndpoint && !apiEndpoint.value) {
    apiEndpoint.value = defaultGenerate;
    console.log('API endpoint set to:', defaultGenerate);
  }

  // Settings Modal (simplified - no need for Gemini API key input)
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsModal = document.getElementById('settings-modal');
  const settingsClose = document.getElementById('settings-close');
  const saveSettings = document.getElementById('save-settings');

  // Settings modal functions
  function openSettingsModal() {
    settingsModal.classList.remove('hidden');
    settingsModal.setAttribute('aria-hidden', 'false');
  }

  function closeSettingsModal() {
    settingsModal.classList.add('hidden');
    settingsModal.setAttribute('aria-hidden', 'true');
  }

  settingsToggle.addEventListener('click', openSettingsModal);
  settingsClose.addEventListener('click', closeSettingsModal);
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  });

  saveSettings?.addEventListener('click', () => {
    try {
      alert('설정이 저장되었습니다.');
      closeSettingsModal();
    } catch {}
  });

  // 사용량 확인 함수
  async function checkUsage() {
    try {
      const generateUrl = (apiEndpoint?.value || '').trim();
      if (!generateUrl) return { remaining: 2, used: 0, maxUses: 2 }; // 기본값을 2로 설정
      
      const usageUrl = generateUrl.replace('/generate', '/usage');
      const res = await fetch(usageUrl);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.log('Usage check failed:', e);
    }
    return { remaining: 2, used: 0, maxUses: 2 }; // fallback도 2로 설정
  }

  // 사용량 표시 업데이트 (항상 무제한 표시)
  async function updateUsageDisplay() {
    status.textContent = '매력을 선택하고 음악을 생성해보세요! 🎵';
    // rows 배열이 초기화된 후에만 호출
    if (typeof rows !== 'undefined') {
      updateGenerateDisabled();
    }
  }

  // 초기 사용량 확인 - rows 배열 초기화 후로 이동

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
    // 카테고리명 띄어쓰기 및 줄바꿈 처리
    let categoryName = cat.category_name;
    if (categoryName.includes('및')) {
      categoryName = categoryName.replace('및', ' 및\n');
    }
    // 띄어쓰기 추가
    categoryName = categoryName
      .replace('정서적안정', '정서적 안정')
      .replace('자기인식', '자기 인식')
      .replace('성실성및책임감', '성실성 및\n책임감')
      .replace('이해심및공감능력', '이해심 및\n공감 능력')
      .replace('유머감각및사교성', '유머 감각 및\n사교성')
      .replace('도덕성및양심', '도덕성 및\n양심')
      .replace('지적호기심및개방성', '지적 호기심 및\n개방성')
      .replace('목표지향성및야망', '목표 지향성 및\n야망');

    const item = el('div', { class: 'picker-category' }, [
      el('div', { class: 'title', text: categoryName })
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
      updateGenerateDisabled();
      updateUsageDisplay();
    }, openPicker);
    rows.push({ row, get, set });
    traitsContainer.appendChild(row);
    // 자동으로 모달 열기 제거 - 사용자가 직접 클릭해야 함
    if (!pref && false) { // 조건을 false로 만들어서 자동 실행 방지
      openPicker((chosenName) => { 
        try { 
          set({ charm_name: chosenName, stage: '5' }); 
          updateGenerateDisabled();
          updateUsageDisplay();
        } catch {} 
      });
    }
  }
  function clearRows() { 
    rows.splice(0, rows.length); 
    traitsContainer.innerHTML = ''; 
    updateGenerateDisabled();
    updateUsageDisplay();
  }

  // rows 배열 초기화 후에 초기 상태 업데이트
  updateUsageDisplay();

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
    const hasGen = Boolean((apiEndpoint?.value || '').trim());
    const hasTraits = rows.map(r => r.get()).filter(t => t.charm_name).length > 0;
    
    // 디버깅용 로그
    console.log('updateGenerateDisabled:', {
      hasGen,
      hasTraits,
      apiEndpoint: apiEndpoint?.value,
      traits: rows.map(r => r.get()),
      disabled: !(hasGen && hasTraits)
    });
    
    generateBtn.disabled = !(hasGen && hasTraits);
    
    // 강제로 버튼 활성화 (임시 디버깅)
    console.log('강제로 버튼 활성화');
    generateBtn.disabled = false;
  }
  
  apiEndpoint?.addEventListener('input', updateGenerateDisabled);
  updateGenerateDisabled();

  // Simplified generation - server handles everything
  generateBtn.addEventListener('click', async () => {
    try {
      const generateUrl = (apiEndpoint?.value || '').trim();
      if (!generateUrl) throw new Error('음악 생성 엔드포인트가 비었습니다.');

      // UI 업데이트: 생성 중 상태
      generateBtn.classList.add('generating');
      generateBtn.querySelector('.loading-spinner').classList.remove('hidden');
      generateBtn.querySelector('.music-icon').style.display = 'none';
      generateBtn.disabled = true;

      const constellation = { traits: rows.map(r => r.get()).filter(t => t.charm_name) };
      const context = {
        duration_seconds: Number(durationSelect.value || 60)
      };

      status.textContent = '음악 생성 중... (최대 1분 소요)';
      
      const genRes = await fetch(generateUrl, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ constellation, context }) 
      });
      
      if (!genRes.ok) {
        const errorData = await genRes.json().catch(() => ({}));
        throw new Error(errorData.error || '음악 생성 프록시 응답 오류');
      }
      
      const data = await genRes.json();
      if (!data.audio_base64) throw new Error('오디오가 없습니다.');

      // 사용자 이름 기반 제목 생성
      const userName = document.getElementById('user-name')?.value?.trim() || '나의';
      const trackTitle = `${userName} 매력 벨소리`;
      
      // 플레이어에 음악 로드
      musicPlayer.loadAudio(data.audio_base64, data.mime || 'audio/wav', trackTitle);
      
      status.textContent = `음악이 준비되었습니다! 🎵 재생해보세요 ✨`;
      
      // 🚀 플레이어에 음악 즉시 전송 (HTTP 직접 호출)
      fetch('https://aster-music-player-default-rtdb.asia-southeast1.firebasedatabase.app/music-tracks.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName,
          title: trackTitle,
          artist: 'Aster AI',
          duration: context.duration_seconds,
          audioUrl: `data:${data.mime || 'audio/wav'};base64,${data.audio_base64}`,
          charmTraits: constellation.traits,
          createdAt: Date.now(),
          source: 'aster-alarm'
        })
      })
      .then(response => {
        if (response.ok) {
          console.log('✅ 플레이어 업로드 완료!');
          status.textContent = `음악이 준비되었습니다! 🎵 플레이어에도 추가됨 ✨`;
        }
      })
      .catch(error => {
        console.error('❌ 플레이어 업로드 실패:', error);
      });
      
      // 버튼 상태 업데이트
      updateGenerateDisabled();
    } catch (e) {
      status.textContent = '실패: ' + (e.message || e);
    } finally {
      // UI 복원
      generateBtn.classList.remove('generating');
      generateBtn.querySelector('.loading-spinner').classList.add('hidden');
      generateBtn.querySelector('.music-icon').style.display = 'inline';
      updateGenerateDisabled();
    }
  });



  // 창닫기 버튼
  const closeWindowBtn = document.getElementById('close-window');
  if (closeWindowBtn) {
    closeWindowBtn.addEventListener('click', () => {
      // 현재 창/탭 닫기 시도
      window.close();
      
      // window.close()가 작동하지 않을 수 있으므로 안내 메시지 표시
      setTimeout(() => {
        status.textContent = '창을 수동으로 닫아주세요 (브라우저 설정에 따라 자동 닫기가 제한될 수 있습니다)';
      }, 100);
    });
  }


  // URL 파라미터 확인 및 데이터 임포트
  function checkImportData() {
    // URL에서 import 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const importParam = urlParams.get('import');
    
    if (importParam) {
      try {
        // Base64 디코딩
        const decodedData = decodeURIComponent(atob(importParam));
        const data = JSON.parse(decodedData);
        
        console.log('🎵 매력카드 데이터 임포트:', data);
        
        // 기존 행 제거
        clearRows();
        
        // 사용자 이름 설정
        if (data.userName) {
          const userNameInput = document.getElementById('user-name');
          if (userNameInput) {
            userNameInput.value = data.userName;
          }
        }
        
        // 매력 데이터 추가
        if (data.charms && Array.isArray(data.charms)) {
          data.charms.forEach(charm => {
            addRow({
              charm_name: charm.charm_name,
              stage: charm.stage
            });
          });
          
          // 알림 표시
          status.textContent = `✨ ${data.userName}님의 매력 ${data.charms.length}개를 불러왔습니다! 음악을 생성해보세요 🎵`;
          
          // URL 파라미터 제거
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (error) {
        console.error('❌ 임포트 데이터 처리 오류:', error);
        // 에러가 있어도 계속 진행
      }
    }
  }
  
  // 초기 매력 4개 추가 (모달 자동 실행 안함)
  // 단, import 데이터가 있으면 이 부분은 건너뜀
  const urlParams = new URLSearchParams(window.location.search);
  const hasImport = urlParams.get('import');
  
  if (!hasImport) {
    addRow({ charm_name: '', stage: '' });
    addRow({ charm_name: '', stage: '' });
    addRow({ charm_name: '', stage: '' });
    addRow({ charm_name: '', stage: '' });
  }
  
  // 임포트 데이터 확인
  checkImportData();
}

main().catch(err => alert(err.message || err));
