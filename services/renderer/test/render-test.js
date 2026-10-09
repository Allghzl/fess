/**
 * Render test — generates one PNG per preset × format combination.
 * Output: test/output/{preset}_{format}.png
 * Run: node test/render-test.js
 */
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { render } from '../src/render.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT   = join(__dir, 'output');

async function loadFonts() {
  const base = join(__dir, '..', 'fonts');
  const [regular, bold] = await Promise.all([
    readFile(join(base, 'Poppins-Regular.ttf')),
    readFile(join(base, 'Poppins-Bold.ttf')),
  ]);
  return {
    regular: regular.buffer.slice(regular.byteOffset, regular.byteOffset + regular.byteLength),
    bold:    bold.buffer.slice(bold.byteOffset, bold.byteOffset + bold.byteLength),
  };
}

const PRESETS = [
  'editorial_geometry',
  'typographic_poster',
  'quiet_editorial',
  'grid_technical',
  'bold_block',
];

const FORMATS = ['story', 'feed_portrait'];

function makeConfig(preset, format) {
  return {
    format,
    show_logo:        true,
    show_website_url: true,
    show_public_id:   true,
    public_id:        'MF-TEST01',
    message:          'Halo kak, aku udah lama suka sama kamu tapi ga pernah berani ngomong. Kamu selalu kelihatan happy dan itu bikin aku semakin suka. Semoga kamu bisa tau siapa aku suatu saat nanti :)',
    target_text:      'Kak Rara',
    alias_text:       'Anonymous',
    tags:             ['Curhat', 'Galau'],
    song_text:        'Teman Tapi Menikah',
    artist_text:      'Yura Yunita',
    music_artwork_url: null,
    music_start_ms:   30000,
    music_duration_ms: 15000,
    class: {
      name:             'XII IPA 2 SMAN 1',
      website_label:    'menfess.example.com',
      instagram_handle: '@xiiipa2menfess',
    },
    design: {
      source:           'builtin',
      preset,
      background_color: null,
      pattern_key:      preset === 'editorial_geometry' ? 'dots' : null,
      pattern_color:    '#FFFFFF',
      pattern_opacity:  0.06,
    },
  };
}

async function main() {
  const fonts = await loadFonts();
  const results = [];

  for (const preset of PRESETS) {
    for (const format of FORMATS) {
      const config = makeConfig(preset, format);
      const fname  = `${preset}_${format}.png`;
      const outPath = join(OUT, fname);
      const start  = Date.now();
      try {
        const png = await render(config, fonts);
        await writeFile(outPath, png);
        const ms = Date.now() - start;
        results.push({ preset, format, status: 'ok', size: png.length, ms, file: fname });
        console.log(`  ok  ${fname}  (${(png.length/1024).toFixed(0)} KB, ${ms}ms)`);
      } catch (err) {
        results.push({ preset, format, status: 'error', error: err.message });
        console.error(`  ERR ${fname}:`, err.message);
      }
    }
  }

  // Also test with a pattern variant and a long message
  const longConfig = makeConfig('bold_block', 'story');
  longConfig.message = 'Gue mau cerita sesuatu yang udah gue pendem lama banget. Kamu tuh orangnya baik banget, sering bantuin orang lain tanpa pamrih. Gue selalu perhatiin kamu dari jauh, tapi ga pernah punya keberanian buat nyamperin. Setiap hari lewat lorong yang sama dan senyum kamu itu selalu bikin hari gue lebih cerah. Makasih ya, meskipun kamu ga tau ini dari siapa.';
  longConfig.design.pattern_key = 'checker';
  longConfig.design.background_color = '#E84B2A';
  const longFname = 'bold_block_story_long.png';
  try {
    const png = await render(longConfig, fonts);
    await writeFile(join(OUT, longFname), png);
    console.log(`  ok  ${longFname}  (${(png.length/1024).toFixed(0)} KB)`);
    results.push({ preset: 'bold_block', format: 'story_long', status: 'ok', file: longFname });
  } catch (err) {
    console.error(`  ERR ${longFname}:`, err.message);
  }

  const ok  = results.filter(r => r.status === 'ok').length;
  const err = results.filter(r => r.status === 'error').length;
  console.log(`\n${ok} passed, ${err} failed`);
  if (err > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
