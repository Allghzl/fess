/**
 * Shared Satori building blocks for all presets.
 * All layout is CSS flexbox + position:absolute. No React.
 */

import { hexToRgb, rgba } from './utils/colors.js';
import { truncate, autoFontSize } from './utils/text.js';

// ── h helper ──────────────────────────────────────────────────────────────────

export function h(type, props, ...children) {
  const flat = children.flat(Infinity).filter(c => c != null && c !== false && c !== undefined);
  return {
    type,
    props: {
      ...props,
      children:
        flat.length === 0 ? undefined :
        flat.length === 1 ? flat[0] : flat,
    },
  };
}

// ── Palette definitions (mirror of PHP PRESETS) ────────────────────────────

export const PRESETS = {
  editorial_geometry: {
    bg: '#1A1F2E', accent: '#5878FF',
    textMain: '#F0EEE6', textDim: '#AAA89E', textMeta: '#78766C',
    tagBg: 'rgba(88,120,255,0.36)', tagText: '#F0EEE6',
  },
  typographic_poster: {
    bg: '#0D0D0D', accent: '#C8F050',
    textMain: '#FAF8F0', textDim: '#A09E94', textMeta: '#646258',
    tagBg: 'rgba(200,240,80,0.52)', tagText: '#0F0F05',
  },
  quiet_editorial: {
    bg: '#E8E0D4', accent: '#5A8258',
    textMain: '#1C1814', textDim: '#5A564E', textMeta: '#827E76',
    tagBg: 'rgba(90,130,88,0.20)', tagText: '#1C1814',
  },
  grid_technical: {
    bg: '#111214', accent: '#00D2B4',
    textMain: '#E8E4DA', textDim: '#969688', textMeta: '#646056',
    tagBg: 'rgba(0,210,180,0.36)', tagText: '#0A1412',
  },
  bold_block: {
    bg: '#E84B2A', accent: '#E84B2A',
    textMain: '#FAF8F0', textDim: '#C8C4B8', textMeta: '#9B968A',
    tagBg: 'rgba(255,255,255,0.24)', tagText: '#FAF8F0',
  },
};

export function getPreset(key) {
  return PRESETS[key] || PRESETS.editorial_geometry;
}

// ── Music data normalization ─────────────────────────────────────────────────

export function resolveMusic(config) {
  const song   = config.song_text   || config.song   || '';
  const artist = config.artist_text || config.artist || '';

  const hasStructured = !!(
    config.music_track_id ||
    config.music_start_ms != null ||
    config.music_artwork_url
  );

  if (!song && !artist && !hasStructured) return { has_music: false };

  const result = { has_music: true, song, artist, start_ms: null, duration_ms: null, artwork_url: null };

  if (hasStructured) {
    result.start_ms    = config.music_start_ms    != null ? parseInt(config.music_start_ms)    : null;
    result.duration_ms = config.music_duration_ms != null ? parseInt(config.music_duration_ms) : null;
    result.artwork_url = config.music_artwork_url || null;
  } else if (config.song_start_seconds != null) {
    result.start_ms = parseInt(config.song_start_seconds) * 1000;
  }

  return result;
}

function fmtMs(ms) {
  const tot = Math.floor(Math.max(0, ms) / 1000);
  const h   = Math.floor(tot / 3600);
  const m   = Math.floor((tot % 3600) / 60);
  const s   = tot % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export function fmtTimeRange(startMs, durationMs) {
  if (startMs == null) return '';
  const start = fmtMs(startMs);
  if (durationMs == null) return start;
  return `${start} — ${fmtMs(startMs + durationMs)}`;
}

// ── Footer geometry (mirrors PHP computeFooter) ───────────────────────────

export function computeFooter(height, hasTags, hasMusic, isStory) {
  const pad        = Math.round(height * 0.022);
  const websiteH   = 30;
  const tagsH      = hasTags  ? 44 : 0;
  const musicCardH = hasMusic ? (isStory ? 108 : 60) : 0;

  const websiteY = height - pad - websiteH;
  const tagsY    = hasTags ? (websiteY - tagsH - 6) : 0;
  const leftTop  = hasTags ? tagsY : websiteY;
  const musicY   = hasMusic ? (height - pad - musicCardH) : 0;
  const zoneTop  = Math.min(leftTop, hasMusic ? musicY : height) - 4;

  return { websiteY, tagsY, musicY, zoneTop };
}

// ── Pattern SVG overlay ───────────────────────────────────────────────────

export function patternOverlay(design, width, height) {
  const key     = design.pattern_key;
  const color   = design.pattern_color || '#FFFFFF';
  const opacity = Math.min(0.18, parseFloat(design.pattern_opacity) || 0.06);
  const tile    = Math.round(width / 27);
  const shapes  = [];

  if (key === 'dots') {
    const r = Math.max(2, Math.round(tile / 5));
    for (let y = tile / 2; y < height + tile; y += tile)
      for (let x = tile / 2; x < width + tile; x += tile)
        shapes.push(h('circle', { key: `${x}_${y}`, cx: String(Math.round(x)), cy: String(Math.round(y)), r: String(r), fill: color }));

  } else if (key === 'grid') {
    for (let x = 0; x <= width; x += tile)
      shapes.push(h('line', { key: `v${x}`, x1: String(x), y1: '0', x2: String(x), y2: String(height), stroke: color, strokeWidth: '1' }));
    for (let y = 0; y <= height; y += tile)
      shapes.push(h('line', { key: `h${y}`, x1: '0', y1: String(y), x2: String(width), y2: String(y), stroke: color, strokeWidth: '1' }));

  } else if (key === 'diagonal_lines') {
    for (let d = -height; d < width + height; d += tile)
      shapes.push(h('line', { key: String(d), x1: String(d), y1: '0', x2: String(d - height), y2: String(height), stroke: color, strokeWidth: '1' }));

  } else if (key === 'plus') {
    const arm = Math.max(1, Math.round(tile / 4));
    for (let y = tile / 2; y < height + tile; y += tile)
      for (let x = tile / 2; x < width + tile; x += tile) {
        const cx = Math.round(x), cy = Math.round(y);
        shapes.push(
          h('rect', { key: `h${cx}_${cy}`, x: String(cx - arm), y: String(cy - 1), width: String(arm * 2), height: '2', fill: color }),
          h('rect', { key: `v${cx}_${cy}`, x: String(cx - 1), y: String(cy - arm), width: '2', height: String(arm * 2), fill: color }),
        );
      }

  } else if (key === 'circles') {
    const r = Math.max(3, Math.round(tile * 0.4));
    for (let y = tile / 2; y < height + tile; y += tile)
      for (let x = tile / 2; x < width + tile; x += tile)
        shapes.push(h('circle', { key: `${x}_${y}`, cx: String(Math.round(x)), cy: String(Math.round(y)), r: String(r), fill: 'none', stroke: color, strokeWidth: '1' }));

  } else if (key === 'triangles') {
    const half = Math.round(tile / 2);
    for (let row = 0; row * tile < height + tile; row++)
      for (let col = 0; col * tile < width + tile; col++) {
        const ox = col * tile + (row % 2 === 0 ? 0 : half);
        const oy = row * tile;
        shapes.push(h('polygon', { key: `${row}_${col}`, points: `${ox},${oy + tile} ${ox + half},${oy} ${ox + tile},${oy + tile}`, fill: color }));
      }

  } else if (key === 'checker') {
    for (let row = 0; row * tile < height; row++)
      for (let col = 0; col * tile < width; col++)
        if ((row + col) % 2 === 0)
          shapes.push(h('rect', { key: `${row}_${col}`, x: String(col * tile), y: String(row * tile), width: String(tile), height: String(tile), fill: color }));

  } else if (key === 'waves') {
    const amp = Math.round(tile / 3);
    for (let row = 0; row * tile < height + tile; row++) {
      const baseY = row * tile;
      let d = `M 0 ${baseY}`;
      for (let x = 4; x <= width; x += 4) {
        const y = baseY + amp * Math.sin(2 * Math.PI * x / tile);
        d += ` L ${x} ${y.toFixed(1)}`;
      }
      shapes.push(h('path', { key: String(row), d, stroke: color, strokeWidth: '1', fill: 'none' }));
    }
  }

  return h('svg', {
    style: { position: 'absolute', top: 0, left: 0 },
    width: String(width),
    height: String(height),
    viewBox: `0 0 ${width} ${height}`,
    xmlns: 'http://www.w3.org/2000/svg',
    opacity: String(opacity),
  }, ...shapes);
}

// ── Tag pills row ─────────────────────────────────────────────────────────

export function tagPillsRow(tags, palette, maxWidth = 99999) {
  if (!tags || tags.length === 0) return null;
  return h('div', {
    style: { display: 'flex', flexDirection: 'row', gap: '8px', flexWrap: 'nowrap' },
  },
    ...tags.slice(0, 3).map(tag =>
      h('div', {
        key: tag,
        style: {
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '6px 12px',
          borderRadius: '99px',
          backgroundColor: palette.tagBg,
          fontSize: '13px',
          fontFamily: 'Poppins',
          fontWeight: 700,
          color: palette.tagText,
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
        },
      }, tag.toUpperCase())
    )
  );
}

// ── Tag pills stacked (right-aligned column, for typographic_poster) ──────

export function tagPillsColumn(tags, palette) {
  if (!tags || tags.length === 0) return null;
  return h('div', {
    style: {
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px',
    },
  },
    ...tags.slice(0, 3).map(tag =>
      h('div', {
        key: tag,
        style: {
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '6px 12px',
          borderRadius: '99px',
          backgroundColor: palette.tagBg,
          fontSize: '13px',
          fontFamily: 'Poppins',
          fontWeight: 700,
          color: palette.tagText,
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
        },
      }, tag.toUpperCase())
    )
  );
}

// ── Website label ─────────────────────────────────────────────────────────

export function websiteText(config) {
  const handle  = config.class?.instagram_handle || '';
  const website = config.class?.website_label    || '';
  return [handle, website].filter(Boolean).join('  ');
}

// ── Music card ────────────────────────────────────────────────────────────

/**
 * @param {object}      music          resolveMusic() output
 * @param {string|null} artworkDataUrl base64 data URL or null
 * @param {number}      width          canvas width
 * @param {number}      height         canvas height
 * @param {boolean}     isStory
 * @param {object}      cardTheme      { bg, textMain, textDim, textMeta, placeholder, accent }
 */
export function musicCard(music, artworkDataUrl, width, height, isStory, cardTheme) {
  if (!music.has_music) return null;

  const timeRange = fmtTimeRange(music.start_ms, music.duration_ms);
  const margin    = Math.round(width * 0.074);

  if (isStory) {
    const cardW   = Math.round(width * 0.35);
    const cardH   = 100;
    const artSize = 72;
    const pad     = 12;
    const cardX   = width - margin - cardW;

    const artworkEl = artworkDataUrl
      ? h('img', {
          src: artworkDataUrl,
          width: artSize,
          height: artSize,
          style: { width: `${artSize}px`, height: `${artSize}px`, borderRadius: '8px', objectFit: 'cover', flexShrink: 0 },
        })
      : h('div', {
          style: {
            width: `${artSize}px`, height: `${artSize}px`, borderRadius: '8px',
            backgroundColor: cardTheme.placeholder || 'rgba(88,120,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          },
        },
          h('span', { style: { fontSize: '28px', color: cardTheme.accent || cardTheme.textDim } }, '♫')
        );

    const textW = cardW - artSize - pad * 2 - 10;

    return h('div', {
      style: {
        position: 'absolute',
        bottom: `${Math.round(height * 0.022)}px`,
        right: `${margin}px`,
        width: `${cardW}px`,
        height: `${cardH}px`,
        borderRadius: '16px',
        backgroundColor: cardTheme.bg,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: `${pad}px`,
        gap: '10px',
        overflow: 'hidden',
      },
    },
      artworkEl,
      h('div', {
        style: {
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: '4px', overflow: 'hidden', flex: 1,
          maxWidth: `${textW}px`,
        },
      },
        music.song && h('div', {
          style: {
            fontSize: '16px', fontWeight: 700, color: cardTheme.textMain,
            fontFamily: 'Poppins', overflow: 'hidden',
            display: 'block', maxWidth: `${textW}px`,
          },
        }, truncate(music.song, 36)),

        music.artist && h('div', {
          style: {
            fontSize: '13px', fontWeight: 400, color: cardTheme.textDim,
            fontFamily: 'Poppins', overflow: 'hidden',
            maxWidth: `${textW}px`,
          },
        }, truncate(music.artist, 40)),

        timeRange && h('div', {
          style: {
            fontSize: '11px', color: cardTheme.textMeta, fontFamily: 'Poppins',
          },
        }, timeRange),
      ),
    );
  } else {
    // Feed: compact block, no card bg
    const artSize = 48;
    const blockW  = Math.round(width * 0.28);
    const artistLine = [music.artist, timeRange].filter(Boolean).join('  ');

    return h('div', {
      style: {
        position: 'absolute',
        bottom: `${Math.round(height * 0.022) + 6}px`,
        right: `${margin}px`,
        width: `${blockW}px`,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '8px',
        overflow: 'hidden',
      },
    },
      artworkDataUrl
        ? h('img', {
            src: artworkDataUrl,
            width: artSize,
            height: artSize,
            style: { width: `${artSize}px`, height: `${artSize}px`, borderRadius: '6px', flexShrink: 0 },
          })
        : h('div', {
            style: {
              width: `${artSize}px`, height: `${artSize}px`, borderRadius: '6px',
              backgroundColor: cardTheme.placeholder || 'rgba(88,120,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            },
          },
            h('span', { style: { fontSize: '20px', color: cardTheme.accent || cardTheme.textDim } }, '♫')
          ),
      h('div', {
        style: {
          display: 'flex', flexDirection: 'column', gap: '3px',
          overflow: 'hidden', flex: 1,
        },
      },
        music.song && h('div', {
          style: { fontSize: '14px', fontWeight: 700, color: cardTheme.textMain, fontFamily: 'Poppins', overflow: 'hidden' },
        }, truncate(music.song, 30)),

        artistLine && h('div', {
          style: { fontSize: '12px', color: cardTheme.textMeta, fontFamily: 'Poppins', overflow: 'hidden' },
        }, truncate(artistLine, 40)),
      ),
    );
  }
}
