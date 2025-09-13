def fill_template(spec: dict) -> str:
    duration = spec.get("duration_seconds", 25)
    kind = spec.get("kind", "instrumental notification sound (벨소리용)")
    concept = spec.get("concept_sentence", "개인 맞춤 알림음 컨셉")

    lead_instrument = spec.get("instruments", {}).get("lead", "felt piano")
    melody_notes_text = spec.get("melody", {}).get("notes_text", "핵심 음들을 중심으로 한 안정적 컨투어")
    lead_rhythm_text = spec.get("melody", {}).get("rhythm_text", "차분하고 여유로운 롱 노트")

    support_instruments_text = ", ".join(spec.get("instruments", {}).get("support", []) or ["harp", "nylon guitar"])
    support_role_text = spec.get("support_role_text", "화성과 공간감을 채움")

    fx_list = spec.get("instruments", {}).get("fx", []) or ["pizzicato strings", "shaker"]
    fx_text = ", ".join(fx_list)
    fx_role_text = spec.get("fx_role_text", "가벼운 질감 포인트")

    genres = spec.get("genres", ["lofi", "neo-soul"])
    genres_text = ", ".join(genres)

    tempo = spec.get("tempo", {})
    tempo_label = tempo.get("label", "moderate")
    bpm = tempo.get("bpm", 100)

    mood_keywords = spec.get("keywords", [])
    mood_keywords_text = ", ".join(mood_keywords) if mood_keywords else "warm, confident, airy, playful"

    avoid = spec.get("avoid", [])
    avoid_text = ", ".join(avoid) if avoid else "sad, slow, melancholic"

    lines = [
        f".{duration}초, {kind}. 전체적인 컨셉은 {concept}.",
        f"메인멜로디는 {lead_instrument}로 연주되며, {melody_notes_text} 형태의 멜로디 라인을 가짐. 리듬은 {lead_rhythm_text} 특징을 보임.",
        f"배경에는 {support_instruments_text}가 {support_role_text}을 수행하며, 가끔씩 {fx_text}가 {fx_role_text}을 더해줌.",
        f"전체 장르는 {genres_text}이며, 템포는 {tempo_label} · 약 {bpm} BPM임. 핵심 분위기 키워드는 {mood_keywords_text}임. 단, {avoid_text}는 사용하지 말 것."
    ]
    return "\n".join(lines)

