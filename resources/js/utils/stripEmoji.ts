// Strip emoji and non-renderable characters from user input.
// GD (PHP image renderer) cannot render emoji — they show as garbled chars.
// This keeps the generated image clean while being transparent to users.
export function stripEmoji(text: string): string {
    return text
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')   // emoji (supplementary planes)
        .replace(/[\u{2600}-\u{27BF}]/gu, '')       // misc symbols, dingbats
        .replace(/[\u{FE00}-\u{FEFF}]/gu, '')       // variation selectors
        .replace(/‍/g, '')                      // zero-width joiner
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')     // regional indicator (flags)
        .replace(/\s{2,}/g, ' ')                     // collapse extra spaces left behind
        .trim();
}
