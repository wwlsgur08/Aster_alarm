from __future__ import annotations

import json
from typing import Any, Dict, List, Tuple


MAJOR_TRIADS = {
    "C": ["C", "E", "G"],
    "D": ["D", "F#", "A"],
    "E": ["E", "G#", "B"],
    "F": ["F", "A", "C"],
    "G": ["G", "B", "D"],
    "A": ["A", "C#", "E"],
    "B": ["B", "D#", "F#"],
}

NOTE_TO_MIDI = {
    "C": 60, "C#": 61, "Db": 61,
    "D": 62, "D#": 63, "Eb": 63,
    "E": 64,
    "F": 65, "F#": 66, "Gb": 66,
    "G": 67, "G#": 68, "Ab": 68,
    "A": 69, "A#": 70, "Bb": 70,
    "B": 71,
}


def load_sound_map(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def find_charm(db: Dict[str, Any], charm_name: str) -> Tuple[str | None, str | None, List[str] | None]:
    for cat in db.get("sound_map", []):
        for c in cat.get("charms", []):
            if c.get("charm_name") == charm_name:
                return cat.get("category_name"), cat.get("international_note"), c.get("keywords", [])
    return None, None, None


def extract_instrument_and_moods(keywords: List[str] | None) -> Tuple[str | None, List[str]]:
    if not keywords:
        return None, []
    instrument = keywords[0]
    moods = [k for k in keywords[1:]] if len(keywords) > 1 else []
    return instrument, moods


def triad_for_note(note: str | None) -> List[str]:
    if not note:
        return ["C", "E", "G"]
    return MAJOR_TRIADS.get(note, ["C", "E", "G"])


def midi_avg(notes: List[str]) -> float:
    vals = [NOTE_TO_MIDI[n] for n in notes if n in NOTE_TO_MIDI]
    return sum(vals) / len(vals) if vals else 64.0


def tempo_from_avg(avg: float, intent: str | None) -> Tuple[int, str]:
    if avg <= 60:
        bpm, label = 80, "slow/andante"
    elif avg <= 72:
        bpm, label = 95, "moderate"
    else:
        bpm, label = 115, "fast/allegro"
    if intent == "wake" and bpm < 95:
        bpm, label = 100, "moderate"
    return bpm, label


def rhythm_feel_from_score(score: float) -> Tuple[str, str]:
    if score >= 85:
        return "차분하고 여유로운 롱 노트", "long, sustained notes"
    if score >= 70:
        return "균형 잡힌 중간 길이의 음표", "quarter and eighth notes"
    return "짧고 경쾌한 리듬", "short, bouncy eighths with light syncopation"


def flow_type_from_intervals(core_notes: List[str]) -> str:
    # 간단 규칙: 기본은 안정적, 샾 포함 음이 많으면 도약적
    sharps = sum(1 for n in core_notes if "#" in n)
    if sharps >= 2:
        return "도약적"
    return "안정적"


def infer_genres(instruments: List[str], mood_keywords: List[str], prefs: Dict[str, Any] | None) -> List[str]:
    if prefs and prefs.get("genres"):
        return prefs["genres"][:3]
    text = " ".join((instruments or []) + (mood_keywords or [] )).lower()
    genres: List[str] = []
    if any(k in text for k in ["piano", "guitar", "nylon", "rhodes", "wurlitzer", "lofi"]):
        genres.append("lofi")
    if any(k in text for k in ["orchestral", "horn", "strings", "cinematic", "timpani", "fanfare"]):
        genres.append("cinematic")
    if any(k in text for k in ["synth", "ambient", "pad", "theremin", "arpeggiator"]):
        genres.append("ambient")
    if not genres:
        genres = ["lofi", "ambient"]
    return genres[:3]


def compose(constellation: Dict[str, Any], context: Dict[str, Any], music_prefs: Dict[str, Any] | None, db: Dict[str, Any]) -> Tuple[Dict[str, Any], str]:
    # traits: [{"charm_name": str, "score": number}]
    raw_traits = constellation.get("traits", [])
    if not raw_traits:
        raise ValueError("constellation.traits 가 비어 있습니다.")

    # map traits -> instrument/moods/category note
    enriched = []
    for t in raw_traits:
        cname = t.get("charm_name") or t.get("name")
        score = t.get("score", 0)
        cat_name, intl_note, keywords = find_charm(db, cname)
        instrument, moods = extract_instrument_and_moods(keywords)
        enriched.append({
            "name": cname,
            "score": score,
            "category": cat_name,
            "root": intl_note,  # C/D/E/F/G/A/B
            "instrument": instrument,
            "moods": moods,
        })

    # roles by score
    enriched.sort(key=lambda x: x["score"], reverse=True)
    lead = enriched[0]
    support = enriched[1:3]
    fx = enriched[3:5]
    ambience = enriched[5:]

    # melody notes from lead/support roots
    roots = [lead.get("root")] + [s.get("root") for s in support]
    triads = []
    for r in roots:
        triads += triad_for_note(r)
    # unique order preserving, pick 3~5
    seen = []
    for n in triads:
        if n not in seen:
            seen.append(n)
    core_notes = seen[:3] if seen else ["C", "E", "G"]
    melody_notes_text = f"{'–'.join(core_notes)}를 중심으로 한 {flow_type_from_intervals(core_notes)} 컨투어"

    # rhythm
    lead_rhythm_ko, lead_rhythm_en = rhythm_feel_from_score(float(lead.get("score", 0)))

    # tempo from avg midi
    avg = midi_avg(core_notes)
    bpm, tempo_label = tempo_from_avg(avg, (context or {}).get("intent"))

    # instruments
    lead_instrument = lead.get("instrument") or "felt piano"
    support_instruments = [s.get("instrument") for s in support if s.get("instrument")]
    fx_instruments = [f.get("instrument") for f in fx if f.get("instrument")]
    support_role_text = "화성과 공간감을 채움"
    fx_role_text = "가벼운 질감 포인트"

    # keywords aggregation
    mood_kw_all: List[str] = []
    for item in (lead, *support, *fx, *ambience):
        mood_kw_all += item.get("moods") or []
    # dedupe, keep order
    picked_moods: List[str] = []
    for m in mood_kw_all:
        if m not in picked_moods:
            picked_moods.append(m)
    top_moods = picked_moods[:6] if picked_moods else ["Warm", "Confident", "Airy", "Playful"]

    # genres
    all_instruments = [lead_instrument] + support_instruments + fx_instruments
    genres = infer_genres(all_instruments, top_moods, music_prefs)

    # concept sentence (short)
    tod = (context or {}).get("time_of_day", "morning")
    intent = (context or {}).get("intent", "wake")
    concept_sentence = f"{tod} {intent} 컨텍스트, " + ", ".join([m.lower() for m in top_moods[:3]]) + " 무드"

    avoid = (context or {}).get("avoid_moods") or ["sad", "melancholic"]

    spec: Dict[str, Any] = {
        "duration_seconds": int((context or {}).get("duration_seconds", 25)),
        "kind": "instrumental notification sound (벨소리용)",
        "concept_sentence": concept_sentence,
        "roles": {
            "lead": [lead.get("name")],
            "support": [s.get("name") for s in support],
            "fx": [f.get("name") for f in fx],
            "ambience": [a.get("name") for a in ambience],
        },
        "melody": {
            "core_notes": core_notes,
            "notes_text": melody_notes_text,
            "rhythm_text": lead_rhythm_ko,
            "rhythm_detail": lead_rhythm_en,
        },
        "instruments": {
            "lead": lead_instrument,
            "support": support_instruments,
            "fx": fx_instruments,
        },
        "genres": genres,
        "tempo": {"label": tempo_label, "bpm": bpm},
        "key": core_notes[0] + " major",
        "time_signature": "4/4",
        "keywords": top_moods,
        "avoid": avoid,
        "support_role_text": support_role_text,
        "fx_role_text": fx_role_text,
    }

    # Build template text here to minimize deps
    from .templates import fill_template
    prompt_text = fill_template(spec)

    return spec, prompt_text

