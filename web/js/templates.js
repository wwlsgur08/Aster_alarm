export function fillTemplate(spec) {
  // Assemble the prompt from the structured blocks based on the new spec
  const prompt = [
    // 1. Identity Block
    spec.identity_prompt,
    spec.core_notes_prompt,
    
    // 2. Form/Length Block
    spec.form_prompt,
    
    // 3. Rhythm/Tempo Block
    spec.rhythm_tempo_prompt,
    
    // 4. Dynamics Block
    spec.dynamics_prompt,

    // Additional details
    `Genres: ${spec.genres.join(', ')}.`,
    `Overall mood keywords: ${spec.keywords.join(', ')}.`,
    
    // 5. Constraints Block
    `Avoid moods: ${spec.avoid.join(', ')}.`,
    spec.constraints_prompt,
  ].filter(Boolean).join(' ');

  return prompt;
}