/**
 * quiet_editorial preset
 * Cream bg, left vertical bar, short horizontal accent rule in footer.
 */
import { h, getPreset, computeFooter, tagPillsRow, websiteText, musicCard, resolveMusic } from '../components.js';
import { autoFontSize } from '../utils/text.js';

export default function quietEditorial(config, artworkDataUrl) {
  const width   = config._width;
  const height  = config._height;
  const isStory = config.format !== 'feed_portrait';

  const design  = config.design || {};
  const palette = getPreset(design.preset || 'quiet_editorial');
  const bg      = design.background_color || palette.bg;
  const accent  = palette.accent;

  const barX   = Math.round(width * 0.072);
  const barW   = Math.max(3, Math.round(width * 0.011));
  const margin = barX + barW + Math.round(width * 0.04);
  const rightM = Math.round(width * 0.074);
  const contentW = width - margin - rightM;

  const target  = config.target_text || config.target || '';
  const alias   = config.alias_text  || config.alias  || '';
  const tags    = config.tags || [];
  const pubId   = config.public_id || 'MF-???';
  const message = config.message || '';

  const music  = resolveMusic(config);
  const footer = computeFooter(height, tags.length > 0, music.has_music, isStory);

  // Left vertical bar
  const leftBar = h('div', {
    style: {
      position: 'absolute',
      left:   `${barX}px`,
      top:    `${Math.round(height * 0.08)}px`,
      width:  `${barW}px`,
      height: `${Math.round(height * 0.84)}px`,
      backgroundColor: accent,
      opacity: '0.35',
    },
  });

  // Header
  const headerY = Math.round(height * 0.085);
  const classFS = Math.round(width * 0.018);
  const idFS    = Math.round(width * 0.016);

  const header = h('div', {
    style: {
      position: 'absolute',
      top:   `${headerY}px`,
      left:  `${margin}px`,
      right: `${rightM}px`,
      display: 'flex', flexDirection: 'row', justifyContent: 'space-between',
    },
  },
    h('div', {
      style: { fontSize: `${classFS}px`, fontFamily: 'Poppins', color: palette.textDim, textTransform: 'uppercase', letterSpacing: '0.04em' },
    }, config.class?.name || ''),

    h('div', {
      style: { fontSize: `${idFS}px`, fontFamily: 'Poppins', color: '#1C1814' },
    }, `#${pubId}`),
  );

  // KEPADA/DARI
  const recipientTop = headerY + classFS * 2 + 12;
  const labelFS = Math.round(width * 0.013);
  const valueFS = Math.round(width * 0.022);

  const recipientBlock = h('div', {
    style: {
      position: 'absolute',
      top:   `${recipientTop}px`,
      left:  `${margin}px`,
      right: `${rightM}px`,
      display: 'flex', flexDirection: 'column', gap: '4px',
    },
  },
    ...[
      target ? [
        h('div', { style: { fontSize: `${labelFS}px`, fontFamily: 'Poppins', color: palette.textMeta } }, 'KEPADA'),
        h('div', { style: { fontSize: `${valueFS}px`, fontFamily: 'Poppins', fontWeight: 700, color: palette.textMain, marginBottom: '8px' } }, target),
      ] : [],
      alias ? [
        h('div', { style: { fontSize: `${labelFS}px`, fontFamily: 'Poppins', color: palette.textMeta } }, 'DARI'),
        h('div', { style: { fontSize: `${valueFS}px`, fontFamily: 'Poppins', fontWeight: 700, color: palette.textDim, marginBottom: '14px' } }, alias),
      ] : [],
    ].flat(),
  );

  // Message
  const recipientH = (target ? labelFS * 1.3 + valueFS * 1.5 + 6 : 0) + (alias ? labelFS * 1.3 + valueFS * 1.5 + 6 : 0);
  const msgTop     = recipientTop + recipientH + 8;
  const msgMaxH    = footer.zoneTop - msgTop - 2;
  const msgMaxChars = message.length;
  const msgMaxPt   = msgMaxChars < 80 ? Math.round(width * 0.067) : Math.round(width * 0.056);
  const msgMinPt   = Math.round(width * 0.026);
  const charFactor = message.length > 600 ? 0.55 : 0.65;
  const msgFS      = message ? autoFontSize(message, contentW, Math.max(60, msgMaxH), msgMinPt, msgMaxPt, charFactor) : msgMinPt;

  const messageBlock = message ? h('div', {
    style: {
      position: 'absolute',
      top:      `${msgTop}px`,
      left:     `${margin}px`,
      right:    `${rightM}px`,
      fontSize:  `${msgFS}px`,
      fontFamily: 'Poppins',
      fontWeight: 400,
      color:     palette.textMain,
      lineHeight: '1.55',
    },
  }, message) : null;

  // Footer: short accent rule, tags, website — all dark text
  const ruleY = footer.tagsY > 0 ? footer.tagsY - 12 : footer.websiteY - 12;

  const footerRule = h('div', {
    style: {
      position: 'absolute',
      top:    `${ruleY}px`,
      left:   `${margin}px`,
      width:  `${Math.round(width * 0.08)}px`,
      height: '1px',
      backgroundColor: accent,
    },
  });

  const footerTags = tags.length > 0 ? h('div', {
    style: {
      position: 'absolute',
      top:  `${footer.tagsY}px`,
      left: `${margin}px`,
      display: 'flex',
    },
  }, tagPillsRow(tags, palette)) : null;

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

  // Music card: dark card on cream bg, light text
  const card = musicCard(music, artworkDataUrl, width, height, isStory, {
    bg:          'rgba(28,24,20,0.72)',
    textMain:    '#F0ECE2',
    textDim:     '#BEBAB0',
    textMeta:    '#969288',
    placeholder: 'rgba(90,130,88,0.4)',
    accent:      accent,
  });

  return h('div', {
    style: {
      width: `${width}px`, height: `${height}px`,
      position: 'relative', overflow: 'hidden',
      backgroundColor: bg, display: 'flex',
    },
  },
    leftBar,
    header,
    recipientBlock,
    messageBlock,
    footerRule,
    footerTags,
    footerWebsite,
    card,
  );
}
