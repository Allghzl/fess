/**
 * Core render function.
 * Fetches artwork, selects preset, calls satori, converts to PNG.
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fetch from 'node-fetch';

import editorialGeometry from './presets/editorial-geometry.js';
import typographicPoster from './presets/typographic-poster.js';
import quietEditorial    from './presets/quiet-editorial.js';
import gridTechnical     from './presets/grid-technical.js';
import boldBlock         from './presets/bold-block.js';

const PRESETS = {
  editorial_geometry: editorialGeometry,
  typographic_poster: typographicPoster,
  quiet_editorial:    quietEditorial,
  grid_technical:     gridTechnical,
  bold_block:         boldBlock,
};

const DIMENSIONS = {
  story:         { width: 1080, height: 1920 },
  feed_portrait: { width: 1080, height: 1350 },
};

// SSRF guard: only these apex domains are allowed for artwork fetching
const ALLOWED_APEX = new Set([
  'scdn.co', 'mzstatic.com', 'ytimg.com',
  'ggpht.com', 'googleusercontent.com', 'audius.co',
]);

function apexDomain(host) {
  const parts = host.split('.');
  return parts.length >= 2 ? parts.slice(-2).join('.') : host;
}

async function fetchArtwork(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    // Reject private/loopback IPs
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.0\.0\.0|::1|fc|fd)/i.test(host)) return null;
    if (!ALLOWED_APEX.has(apexDomain(host))) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) return null;

    const buf = Buffer.from(await resp.arrayBuffer());
    const ct  = resp.headers.get('content-type') || 'image/jpeg';
    const mime = ct.split(';')[0].trim() || 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

import { truncate } from './utils/text.js';

/**
 * @param {object} config  full render config from Laravel
 * @param {object} fonts   { regular: ArrayBuffer, bold: ArrayBuffer }
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function render(config, fonts) {
  const fmt    = config.format === 'feed_portrait' ? 'feed_portrait' : 'story';
  const { width, height } = DIMENSIONS[fmt];

  // Attach dimensions to config so presets can read them without parameters
  config._width  = width;
  config._height = height;

  // Truncate long recipient/sender names so they never overflow their zone
  if (config.target_text) config.target_text = truncate(config.target_text, 48);
  if (config.alias_text)  config.alias_text  = truncate(config.alias_text, 40);

  const presetKey = config.design?.preset || 'editorial_geometry';
  const presetFn  = PRESETS[presetKey] || PRESETS.editorial_geometry;

  // Fetch artwork (SSRF-safe, base64)
  const artworkDataUrl = await fetchArtwork(config.music_artwork_url || null);

  const element = presetFn(config, artworkDataUrl);

  const satoriOpts = {
    width,
    height,
    fonts: [
      { name: 'Poppins', data: fonts.regular, weight: 400, style: 'normal' },
      { name: 'Poppins', data: fonts.bold,    weight: 700, style: 'normal' },
    ],
    // Emoji support via Twemoji CDN
    loadAdditionalAsset: async (code, segment) => {
      if (code === 'emoji') {
        try {
          const cp = segment.codePointAt(0).toString(16);
          const resp = await fetch(
            `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${cp}.svg`,
          );
          if (!resp.ok) return null;
          const svg = await resp.text();
          return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
        } catch {
          return null;
        }
      }
      return null;
    },
  };

  const svg = await satori(element, satoriOpts);

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}
