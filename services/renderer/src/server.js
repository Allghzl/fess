/**
 * Express HTTP server for the Satori renderer sidecar.
 * POST /render — body: JSON render config → PNG binary
 * GET  /health — returns {"ok":true}
 */
import express from 'express';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { render } from './render.js';

const __dir  = dirname(fileURLToPath(import.meta.url));
const PORT   = parseInt(process.env.PORT || '8766', 10);

// Load fonts once at startup
async function loadFonts() {
  const base = join(__dir, '..', 'fonts');
  const [regular, bold] = await Promise.all([
    readFile(join(base, 'Poppins-Regular.ttf')),
    readFile(join(base, 'Poppins-Bold.ttf')),
  ]);
  // Satori wants ArrayBuffer
  return {
    regular: regular.buffer.slice(regular.byteOffset, regular.byteOffset + regular.byteLength),
    bold:    bold.buffer.slice(bold.byteOffset, bold.byteOffset + bold.byteLength),
  };
}

async function main() {
  const fonts = await loadFonts();
  console.log('Fonts loaded.');

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/render', async (req, res) => {
    const config = req.body;
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'body must be JSON render config' });
    }
    try {
      const png = await render(config, fonts);
      res.set('Content-Type', 'image/png');
      res.set('Content-Length', String(png.length));
      res.send(png);
    } catch (err) {
      console.error('render error:', err);
      res.status(500).json({ error: err.message || 'render failed' });
    }
  });

  app.listen(PORT, () => {
    console.log(`renderer listening on :${PORT}`);
  });
}

main().catch(err => {
  console.error('startup error:', err);
  process.exit(1);
});
