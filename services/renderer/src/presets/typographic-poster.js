/**
 * typographic_poster preset
 * Zero geometry. One thin rule. Tags in right column. Message justified.
 */
import { h, getPreset, computeFooter, tagPillsColumn, websiteText, musicCard, resolveMusic } from '../components.js';
import { autoFontSize } from '../utils/text.js';

export default function typographicPoster(config, artworkDataUrl) {
  const width   = config._width;
  const height  = config._height;
  const isStory = config.format !== 'feed_portrait';

  const design  = config.design || {};
  const palette = getPreset(design.preset || 'typographic_poster');
  const bg      = design.background_color || palette.bg;
  const accent  = palette.accent;

  const margin   = Math.round(width * 0.09);
  const contentW = width - margin * 2;

  const target  = config.target_text || config.target || '';
  const alias   = config.alias_text  || config.alias  || '';
  const tags    = config.tags || [];
  const pubId   = config.public_id || 'MF-???';
  const message = config.message || '';

  const music  = resolveMusic(config);
  const footer = computeFooter(height, false, music.has_music, isStory);

  // Header: class name left, #ID right, then rule
  const headerY  = Math.round(height * 0.068);
  const classFS  = Math.round(width * 0.016);
  const idFS     = Math.round(width * 0.016);
  const ruleY    = Math.round(height * 0.098);

  const header = h('div', {
    style: {
      position: 'absolute',
      top:   `${headerY}px`,
      left:  `${margin}px`,
      right: `${margin}px`,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
  },
    h('div', {
      style: { fontSize: `${classFS}px`, fontFamily: 'Poppins', color: palette.textDim },
    }, config.class?.name || ''),

    h('div', {
      style: { fontSize: `${idFS}px`, fontFamily: 'Poppins', color: accent },
    }, `#${pubId}`),
  );

  const rule = h('div', {
    style: {
      position: 'absolute',
      top:    `${ruleY}px`,
      left:   `${margin}px`,
      right:  `${margin}px`,
      height: '1px',
      backgroundColor: accent,
      opacity: '0.4',
    },
  });

  // Tags — right column starting at 11.2%
  const contentTop = Math.round(height * 0.112);
  const tagColW    = Math.round(contentW * 0.36);

  const tagColumn = tags.length > 0 ? h('div', {
    style: {
      position: 'absolute',
      top:   `${contentTop + 4}px`,
      right: `${margin}px`,
      width: `${tagColW}px`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '6px',
    },
  }, tagPillsColumn(tags, palette)) : null;

  // KEPADA/DARI left column
  const recipientW  = Math.round(contentW * 0.60);
  const labelFS     = Math.round(width * 0.012);
  const valueFS     = Math.round(width * 0.020);

  let recipientH = 0;
  if (target) recipientH += labelFS * 1.3 + valueFS * 1.5 + 6;
  if (alias)  recipientH += labelFS * 1.3 + valueFS * 1.5 + 6;
  if (target || alias) recipientH += 16; // rule + gap

  const recipientBlock = h('div', {
    style: {
      position: 'absolute',
      top:   `${contentTop}px`,
      left:  `${margin}px`,
      width: `${recipientW}px`,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    },
  },
    ...[
      target ? [
        h('div', { style: { fontSize: `${labelFS}px`, fontFamily: 'Poppins', color: palette.textMeta } }, 'KEPADA'),
        h('div', { style: { fontSize: `${valueFS}px`, fontFamily: 'Poppins', fontWeight: 700, color: palette.textDim, marginBottom: '6px' } }, target),
      ] : [],
      alias ? [
        h('div', { style: { fontSize: `${labelFS}px`, fontFamily: 'Poppins', color: palette.textMeta } }, 'DARI'),
        h('div', { style: { fontSize: `${valueFS}px`, fontFamily: 'Poppins', fontWeight: 700, color: palette.textDim, marginBottom: '6px' } }, alias),
      ] : [],
      (target || alias) ? [
        h('div', {
          style: {
            width: `${Math.round(contentW * 0.2)}px`,
            height: '1px',
            backgroundColor: accent,
            opacity: '0.6',
            marginBottom: '8px',
          },
        }),
      ] : [],
    ].flat(),
  );

  // Message: auto-size 2.2%–7% cw, centered vertically in zone
  const msgZoneTop = contentTop + recipientH + 8;
  const msgMaxH    = footer.zoneTop - msgZoneTop;
  const msgMinPt   = Math.round(width * 0.022);
  const msgMaxPt   = Math.round(width * 0.07);
  const charFactor = message.length > 600 ? 0.55 : 0.65;
  const msgFS      = message ? autoFontSize(message, contentW, Math.max(60, msgMaxH), msgMinPt, msgMaxPt, charFactor) : msgMinPt;

  const messageBlock = message ? h('div', {
    style: {
      position: 'absolute',
      top:      `${msgZoneTop}px`,
      left:     `${margin}px`,
      right:    `${margin}px`,
      fontSize:  `${msgFS}px`,
      fontFamily: 'Poppins',
      fontWeight: 400,
      color:     palette.textMain,
      lineHeight: '1.5',
    },
  }, message) : null;

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
    bg:          'rgba(10,10,10,0.82)',
    textMain:    palette.textMain,
    textDim:     palette.textDim,
    textMeta:    palette.textMeta,
    placeholder: 'rgba(200,240,80,0.3)',
    accent:      accent,
  });

  return h('div', {
    style: {
      width: `${width}px`, height: `${height}px`,
      position: 'relative', overflow: 'hidden',
      backgroundColor: bg, display: 'flex',
    },
  },
    header,
    rule,
    tagColumn,
    recipientBlock,
    messageBlock,
    footerWebsite,
    card,
  );
}
