// Strip emoji and non-renderable characters from user input.
// GD (PHP image renderer) cannot render emoji — they show as garbled chars.
// This keeps the generated image clean while being transparent to users.
export function stripEmoji(text: string): string {
    return text
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
        .replace(/[\u{2600}-\u{27BF}]/gu, '')
        .replace(/[\u{FE00}-\u{FEFF}]/gu, '')
        .replace(/‍/g, '')
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '');
}
