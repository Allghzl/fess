/**
 * grid_technical preset
 * Dark bg, fine grid overlay, vertical column divider at 65%, double rule at 10.5%.
 * Left col: message. Right col: KEPADA/DARI/KATEGORI.
 */
import { h, getPreset, computeFooter, websiteText, musicCard, resolveMusic } from '../components.js';
import { autoFontSize } from '../utils/text.js';
import { patternOverlay } from '../components.js';

export default function gridTechnical(config, artworkDataUrl) {
  const width   = config._width;
  const height  = config._height;
  const isStory = config.format !== 'feed_portrait';

  const design  = config.design || {};
  const palette = getPreset(design.preset || 'grid_technical');
  const bg      = design.background_color || palette.bg;
  const accent  = palette.accent;

  const margin  = Math.round(width * 0.072);
  const split   = Math.round(width * 0.65);
  const gutter  = Math.round(width * 0.025);
  const leftW   = split - margin - Math.round(width * 0.015);
  const rightX  = split + gutter;
  const rightW  = width - rightX - margin;

  const target  = config.target_text || config.target || '';
  const alias   = config.alias_text  || config.alias  || '';
  const tags    = config.tags || [];
  const pubId   = config.public_id || 'MF-???';
  const message = config.message || '';

  const music  = resolveMusic(config);
  const footer = computeFooter(height, tags.length > 0, music.has_music, isStory);

  // Fine grid overlay: accent opacity 0.04, tile = 1/24 width
  const gridTile = Math.round(width / 24);
  const gridDesign = {
    pattern_key:     'grid',
    pattern_color:   accent,
    pattern_opacity: 0.04,
  };

  // Header
  const headerY = Math.round(height * 0.072);
  const classFS = Math.round(width * 0.020);
  const idFS    = Math.round(width * 0.018);

  const header = h('div', {
    style: {
      position: 'absolute',
      top:   `${headerY}px`,
      left:  `${margin}px`,
      right: `${margin}px`,
      display: 'flex', flexDirection: 'row', justifyContent: 'space-between',
    },
  },
    h('div', {
      style: { fontSize: `${classFS}px`, fontFamily: 'Poppins', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.04em' },
    }, config.class?.name || ''),

    h('div', {
      style: { fontSize: `${idFS}px`, fontFamily: 'Poppins', fontWeight: 700, color: accent },
    }, `#${pubId}`),
  );

  // Double horizontal rule at 10.5%
  const hr1Y = Math.round(height * 0.105);
  const ruleColor = `${accent}66`; // ~40% opacity
  const rule = h('div', {
    style: {
      position: 'absolute',
      top: `${hr1Y}px`, left: `${margin}px`, right: `${margin}px`,
      display: 'flex', flexDirection: 'column', gap: '3px',
    },
  },
    h('div', { style: { height: '1px', backgroundColor: accent, opacity: '0.4' } }),
    h('div', { style: { height: '1px', backgroundColor: accent, opacity: '0.4' } }),
  );

  // Vertical column divider
  const divider = h('div', {
    style: {
      position: 'absolute',
      top:    `${Math.round(height * 0.10)}px`,
      left:   `${split}px`,
      width:  '1px',
      height: `${Math.round(height * 0.80)}px`,
      backgroundColor: accent,
      opacity: '0.4',
    },
  });

  // Left column: message
  const msgY   = Math.round(height * 0.125);
  const msgMaxH = footer.zoneTop - msgY;
  const msgMinPt = Math.round(width * 0.024);
  const msgMaxPt = Math.round(width * 0.052);
  const charFactor = message.length > 600 ? 0.55 : 0.65;
  const msgFS   = message ? autoFontSize(message, leftW, Math.max(60, msgMaxH), msgMinPt, msgMaxPt, charFactor) : msgMinPt;

  const leftMessage = message ? h('div', {
    style: {
      position: 'absolute',
      top:      `${msgY}px`,
      left:     `${margin}px`,
      width:    `${leftW}px`,
      fontSize:  `${msgFS}px`,
      fontFamily: 'Poppins',
      fontWeight: 400,
      color:     palette.textMain,
      lineHeight: '1.55',
    },
  }, message) : null;

  // Right column: KEPADA, DARI, KATEGORI
  const rY     = Math.round(height * 0.125);
  const lblFS  = Math.round(width * 0.013);
  const valFS  = Math.round(width * 0.022);

  const rightItems = [];
  if (target) {
    rightItems.push(
      h('div', { style: { fontSize: `${lblFS}px`, fontFamily: 'Poppins', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' } }, 'KEPADA'),
      h('div', { style: { fontSize: `${valFS}px`, fontFamily: 'Poppins', color: palette.textDim, marginBottom: '14px' } }, target),
    );
  }
  if (alias) {
    rightItems.push(
      h('div', { style: { fontSize: `${lblFS}px`, fontFamily: 'Poppins', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' } }, 'DARI'),
      h('div', { style: { fontSize: `${valFS}px`, fontFamily: 'Poppins', color: palette.textDim, marginBottom: '14px' } }, alias),
    );
  }
  if (tags.length > 0) {
    rightItems.push(
      h('div', { style: { fontSize: `${lblFS}px`, fontFamily: 'Poppins', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' } }, 'KATEGORI'),
      ...tags.slice(0, 3).map(tag =>
        h('div', { key: tag, style: { fontSize: `${Math.round(valFS * 0.8)}px`, fontFamily: 'Poppins', color: palette.textDim, marginBottom: '2px' } }, tag.toUpperCase())
      ),
    );
  }

  const rightColumn = h('div', {
    style: {
      position: 'absolute',
      top:   `${rY}px`,
      left:  `${rightX}px`,
      width: `${rightW}px`,
      display: 'flex',
      flexDirection: 'column',
    },
  }, ...rightItems);

  // Footer rule + website
  const footerRuleLine = h('div', {
    style: {
      position: 'absolute',
      top:    `${footer.zoneTop + 4}px`,
      left:   `${margin}px`,
      right:  `${margin}px`,
      height: '1px',
      backgroundColor: accent,
      opacity: '0.4',
    },
  });

  const websiteLabel = websiteText(config);
  const footerWebsite = websiteLabel ? h('div', {
    style: {
      position: 'absolute',
      bottom:  `${Math.round(height * 0.022)}px`,
      left:    `${margin}px`,
      fontSize: `${Math.round(width * 0.014)}px`,
      fontFamily: 'Poppins',
      color:    palette.textMeta,
    },
  }, websiteLabel) : null;

  const card = musicCard(music, artworkDataUrl, width, height, isStory, {
    bg:          'rgba(0,30,26,0.85)',
    textMain:    palette.textMain,
    textDim:     palette.textDim,
    textMeta:    palette.textMeta,
    placeholder: 'rgba(0,210,180,0.3)',
    accent:      accent,
  });

  return h('div', {
    style: {
      width: `${width}px`, height: `${height}px`,
      position: 'relative', overflow: 'hidden',
      backgroundColor: bg, display: 'flex',
    },
  },
    patternOverlay(gridDesign, width, height),
    header,
    rule,
    divider,
    leftMessage,
    rightColumn,
    footerRuleLine,
    footerWebsite,
    card,
  );
}
