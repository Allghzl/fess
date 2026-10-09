/**
 * editorial_geometry preset
 * Four rings bleeding off edges, tonal content zone, KEPADA/DARI, message, footer.
 */
import { h, getPreset, computeFooter, patternOverlay, tagPillsRow, websiteText, musicCard, resolveMusic } from '../components.js';
import { autoFontSize } from '../utils/text.js';
import { hexToRgb } from '../utils/colors.js';

export default function editorialGeometry(config, artworkDataUrl) {
  const width   = config._width;
  const height  = config._height;
  const isStory = config.format !== 'feed_portrait';

  const design   = config.design || {};
  const palette  = getPreset(design.preset || 'editorial_geometry');
  const bg       = design.background_color || palette.bg;
  const accent   = palette.accent;

  const margin    = Math.round(width * 0.074);
  const contentW  = width - margin * 2;
  const ringThick = Math.max(8, Math.round(width * 0.018));

  const target  = config.target_text || config.target || '';
  const alias   = config.alias_text  || config.alias  || '';
  const tags    = config.tags || [];
  const pubId   = config.public_id || 'MF-???';
  const message = config.message || '';

  const music  = resolveMusic(config);
  const footer = computeFooter(height, tags.length > 0, music.has_music, isStory);

  const headerY     = Math.round(height * 0.068);
  const classNameFS = Math.round(width * 0.024);
  const idFS        = Math.round(width * 0.018);

  // Rings SVG — no backdrop, no text (Satori doesn't support SVG <text>)
  const ringSvg = h('svg', {
    style: { position: 'absolute', top: 0, left: 0 },
    width: String(width),
    height: String(height),
    viewBox: `0 0 ${width} ${height}`,
    xmlns: 'http://www.w3.org/2000/svg',
  },
    h('circle', {
      cx: String(Math.round(width * 0.88)),
      cy: String(Math.round(height * -0.06)),
      r:  String(Math.round(width * 0.23)),
      fill: 'none', stroke: accent,
      strokeWidth: String(ringThick), opacity: '1',
    }),
    h('circle', {
      cx: String(Math.round(width * 0.96)),
      cy: String(Math.round(height * 0.05)),
      r:  String(Math.round(width * 0.14)),
      fill: 'none', stroke: accent,
      strokeWidth: String(Math.round(ringThick * 0.6)), opacity: '0.45',
    }),
    h('circle', {
      cx: String(Math.round(width * -0.06)),
      cy: String(Math.round(height * 0.68)),
      r:  String(Math.round(width * 0.13)),
      fill: 'none', stroke: accent,
      strokeWidth: String(Math.round(ringThick * 0.85)), opacity: '0.45',
    }),
    h('circle', {
      cx: String(Math.round(width * 1.04)),
      cy: String(Math.round(height * 0.88)),
      r:  String(Math.round(width * 0.10)),
      fill: 'none', stroke: accent,
      strokeWidth: String(Math.round(ringThick * 0.55)), opacity: '0.22',
    }),
  );

  // Tonal zone: y 17%–90%, full width
  const tonalZone = h('div', {
    style: {
      position: 'absolute',
      top:    `${Math.round(height * 0.17)}px`,
      left:   '0',
      width:  `${width}px`,
      height: `${Math.round(height * 0.73)}px`,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
  });

  // Header backdrop — solid bg color so rings don't bleed behind text
  const { r: bgR, g: bgG, b: bgB } = hexToRgb(bg);
  const headerBackdrop = h('div', {
    style: {
      position: 'absolute',
      top:    '0',
      left:   '0',
      width:  `${width}px`,
      height: `${Math.round(height * 0.155)}px`,
      backgroundColor: `rgb(${bgR},${bgG},${bgB})`,
    },
  });

  // Header: class name left, #ID right — ID placed lower inside tonal zone for guaranteed readability
  const idTopY = Math.round(height * 0.18); // inside tonal zone start (17%)
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
      style: {
        fontSize: `${classNameFS}px`, fontFamily: 'Poppins', fontWeight: 700,
        color: accent, letterSpacing: '0.08em',
        textTransform: 'uppercase',
      },
    }, config.class?.name || ''),
  );

  // #ID rendered separately inside tonal zone so it always has a backing
  const idLabel = h('div', {
    style: {
      position: 'absolute',
      top:   `${idTopY}px`,
      right: `${margin}px`,
      fontSize: `${idFS}px`, fontFamily: 'Poppins', fontWeight: 400,
      color: accent, textAlign: 'right',
    },
  }, `#${pubId}`);

  // KEPADA/DARI block — starts at 22% height
  const recipientTop = Math.round(height * 0.20);
  const labelFS = Math.round(width * 0.012);
  const valueFS = Math.round(width * 0.022);

  const recipientBlock = h('div', {
    style: {
      position: 'absolute',
      top:   `${recipientTop}px`,
      left:  `${margin}px`,
      right: `${margin}px`,
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    },
  },
    ...[
      target ? [
        h('div', { style: { fontSize: `${labelFS}px`, fontFamily: 'Poppins', color: palette.textMeta, letterSpacing: '0.05em' } }, 'KEPADA'),
        h('div', { style: { fontSize: `${valueFS}px`, fontFamily: 'Poppins', fontWeight: 700, color: palette.textDim, marginBottom: '8px' } }, target),
      ] : [],
      alias ? [
        h('div', { style: { fontSize: `${labelFS}px`, fontFamily: 'Poppins', color: palette.textMeta, letterSpacing: '0.05em' } }, 'DARI'),
        h('div', { style: { fontSize: `${valueFS}px`, fontFamily: 'Poppins', fontWeight: 700, color: palette.textDim } }, alias),
      ] : [],
    ].flat(),
  );

  // Message — auto font size between 2%–5% canvas width
  // Estimate actual rendered height of recipient block — Satori lineHeight ~1.3 for label+value
  const recipientBlockH = (labelFS * 1.3 + valueFS * 1.5 + 6);
  const msgTop    = recipientTop + (target ? recipientBlockH : 0) + (alias ? recipientBlockH : 0) + (target || alias ? 4 : 0);
  const msgMaxH   = footer.zoneTop - msgTop - 2;
  const msgMinPt  = Math.round(width * 0.02);
  const msgMaxPt  = Math.round(width * 0.05);
  // Use tighter factor for longer texts so font fills the zone better
  const charFactor = message.length > 600 ? 0.55 : 0.65;
  const msgFS     = message ? autoFontSize(message, contentW, Math.max(60, msgMaxH), msgMinPt, msgMaxPt, charFactor) : msgMinPt;

  const messageBlock = message ? h('div', {
    style: {
      position: 'absolute',
      top:      `${msgTop}px`,
      left:     `${margin}px`,
      right:    `${margin}px`,
      fontSize:  `${msgFS}px`,
      fontFamily: 'Poppins',
      fontWeight: 400,
      color:     palette.textMain,
      lineHeight: '1.55',
    },
  }, message) : null;

  // Footer
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

  const footerTags = tags.length > 0 ? h('div', {
    style: {
      position: 'absolute',
      bottom:  `${height - footer.tagsY}px`,
      left:    `${margin}px`,
      display: 'flex',
    },
  }, tagPillsRow(tags, palette)) : null;

  const card = musicCard(music, artworkDataUrl, width, height, isStory, {
    bg:          'rgba(15,20,35,0.82)',
    textMain:    palette.textMain,
    textDim:     palette.textDim,
    textMeta:    palette.textMeta,
    placeholder: 'rgba(88,120,255,0.3)',
    accent:      palette.accent,
  });

  return h('div', {
    style: {
      width:  `${width}px`,
      height: `${height}px`,
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: bg,
      display: 'flex',
    },
  },
    headerBackdrop,
    ringSvg,
    design.pattern_key ? patternOverlay(design, width, height) : null,
    tonalZone,
    header,
    idLabel,
    recipientBlock,
    messageBlock,
    footerWebsite,
    footerTags,
    card,
  );
}
