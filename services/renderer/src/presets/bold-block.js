/**
 * bold_block preset
 * Top 20% accent color, bottom 80% dark (#0A0A0C).
 * Tonal disc top-right. Tags below split line. Message in bottom zone.
 */
import { h, getPreset, computeFooter, websiteText, musicCard, resolveMusic, tagPillsRow, patternOverlay } from '../components.js';
import { autoFontSize } from '../utils/text.js';
import { hexToRgb, darkenHex } from '../utils/colors.js';

export default function boldBlock(config, artworkDataUrl) {
  const width   = config._width;
  const height  = config._height;
  const isStory = config.format !== 'feed_portrait';

  const design  = config.design || {};
  const palette = getPreset(design.preset || 'bold_block');
  const bg      = design.background_color || palette.bg;

  const margin  = Math.round(width * 0.074);
  const split   = Math.round(height * 0.20);
  const contentW = width - margin * 2;

  const target  = config.target_text || config.target || '';
  const alias   = config.alias_text  || config.alias  || '';
  const tags    = config.tags || [];
  const pubId   = config.public_id || 'MF-???';
  const message = config.message || '';

  const music  = resolveMusic(config);
  const footer = computeFooter(height, false, music.has_music, isStory);

  // Top block
  const topBlock = h('div', {
    style: {
      position: 'absolute',
      top: '0', left: '0', width: `${width}px`, height: `${split}px`,
      backgroundColor: bg,
      display: 'flex', overflow: 'hidden',
    },
  },
    // Pattern overlay on top block only
    design.pattern_key ? patternOverlay(design, width, split) : null,

    // Tonal disc top-right bleeding off edge
    (() => {
      const { r, g, b } = hexToRgb(bg);
      const dr = Math.max(0, r - 38), dg = Math.max(0, g - 32), db = Math.max(0, b - 25);
      return h('div', {
        style: {
          position: 'absolute',
          right: `${Math.round(width * -0.02)}px`,
          top:   `${Math.round(split * -0.04)}px`,
          width:  `${Math.round(width * 0.56)}px`,
          height: `${Math.round(width * 0.56)}px`,
          borderRadius: '50%',
          backgroundColor: `rgba(${dr},${dg},${db},0.35)`,
        },
      });
    })(),

    // Header text in top block (dark text #0A0A0C)
    h('div', {
      style: {
        position: 'absolute',
        top:   `${Math.round(split * 0.10)}px`,
        left:  `${margin}px`,
        right: `${margin}px`,
        display: 'flex', flexDirection: 'column', gap: '4px',
      },
    },
      // Class name + ID row
      h('div', { style: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: '6px' } },
        h('div', {
          style: { fontSize: `${Math.round(width * 0.022)}px`, fontFamily: 'Poppins', fontWeight: 700, color: '#0A0A0C', textTransform: 'uppercase', letterSpacing: '0.04em' },
        }, config.class?.name || ''),
        h('div', {
          style: { fontSize: `${Math.round(width * 0.018)}px`, fontFamily: 'Poppins', color: '#0A0A0C' },
        }, `#${pubId}`),
      ),
      // KEPADA
      ...(target ? [
        h('div', { style: { fontSize: `${Math.round(width * 0.013)}px`, fontFamily: 'Poppins', color: '#0A0A0C', opacity: '0.7', textTransform: 'uppercase' } }, 'KEPADA'),
        h('div', { style: { fontSize: `${Math.round(width * 0.026)}px`, fontFamily: 'Poppins', fontWeight: 700, color: '#0A0A0C', marginBottom: '4px' } }, target),
      ] : []),
      // DARI
      ...(alias ? [
        h('div', { style: { fontSize: `${Math.round(width * 0.013)}px`, fontFamily: 'Poppins', color: '#0A0A0C', opacity: '0.7', textTransform: 'uppercase' } }, 'DARI'),
        h('div', { style: { fontSize: `${Math.round(width * 0.026)}px`, fontFamily: 'Poppins', fontWeight: 700, color: '#0A0A0C' } }, alias),
      ] : []),
    ),
  );

  // Bottom block
  const bottomBlock = h('div', {
    style: {
      position: 'absolute',
      top: `${split}px`, left: '0', width: `${width}px`, height: `${height - split}px`,
      backgroundColor: '#0A0A0C',
    },
  });

  // Tags strip: right-aligned pills just below split
  const tagStrip = tags.length > 0 ? h('div', {
    style: {
      position: 'absolute',
      top:   `${split + 8}px`,
      right: `${margin}px`,
      display: 'flex', flexDirection: 'row', gap: '8px',
    },
  },
    ...tags.slice(0, 3).map(tag =>
      h('div', {
        key: tag,
        style: {
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '6px 12px', borderRadius: '99px',
          backgroundColor: 'rgba(255,255,255,0.18)',
          fontSize: '13px', fontFamily: 'Poppins', fontWeight: 700,
          color: palette.textMain, letterSpacing: '0.06em', whiteSpace: 'nowrap',
        },
      }, tag.toUpperCase())
    )
  ) : null;

  // Message in bottom zone
  const tagStripH = tags.length > 0 ? 44 : 0;
  const bodyTop   = split + tagStripH + Math.round(height * 0.03);
  const msgMaxH   = footer.zoneTop - bodyTop - 2;
  const msgMinPt  = Math.round(width * 0.022);
  const msgMaxPt  = Math.round(width * 0.060);
  const charFactor = message.length > 600 ? 0.55 : 0.65;
  const msgFS     = message ? autoFontSize(message, contentW, Math.max(60, msgMaxH), msgMinPt, msgMaxPt, charFactor) : msgMinPt;

  const messageBlock = message ? h('div', {
    style: {
      position: 'absolute',
      top:      `${bodyTop}px`,
      left:     `${margin}px`,
      right:    `${margin}px`,
      fontSize:  `${msgFS}px`,
      fontFamily: 'Poppins',
      fontWeight: 400,
      color:     palette.textMain,
      lineHeight: '1.55',
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
      color:    'rgba(180,174,162,1)',
    },
  }, websiteLabel) : null;

  const card = musicCard(music, artworkDataUrl, width, height, isStory, {
    bg:          'rgba(20,20,22,0.88)',
    textMain:    palette.textMain,
    textDim:     palette.textDim,
    textMeta:    palette.textMeta,
    placeholder: 'rgba(80,80,84,0.5)',
    accent:      palette.accent,
  });

  return h('div', {
    style: {
      width: `${width}px`, height: `${height}px`,
      position: 'relative', overflow: 'hidden',
      backgroundColor: '#0A0A0C', display: 'flex',
    },
  },
    bottomBlock,
    topBlock,
    tagStrip,
    messageBlock,
    footerWebsite,
    card,
  );
}
