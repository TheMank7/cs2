const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const express = require('express');

const isDev = process.env.ELECTRON_DEV === 'true' || process.env.NODE_ENV === 'development';
let backendServer = null;

function getDataDir() {
  return app.getPath('userData');
}

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(path.join(getDataDir(), file), 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(file, value) {
  await fs.mkdir(getDataDir(), { recursive: true });
  await fs.writeFile(path.join(getDataDir(), file), JSON.stringify(value, null, 2), 'utf8');
}

function parseCurrency(value) {
  if (!value || typeof value !== 'string') return null;
  let cleaned = value.replace(/[^0-9.,-]/g, '').trim();
  if (!cleaned) return null;
  if (cleaned.includes(',') && cleaned.includes('.')) cleaned = cleaned.replace(/,/g, '');
  else if (cleaned.includes(',') && !cleaned.includes('.')) cleaned = cleaned.replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSteamJson(url) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'CS2-Inventory-Tracker-Desktop/1.0',
      'Accept': 'application/json,text/plain,*/*'
    }
  });

  if (r.status === 429) {
    const err = new Error('Steam returned 429 Too Many Requests. Wait 30-60 minutes before trying again.');
    err.status = 429;
    throw err;
  }

  if (!r.ok) {
    const err = new Error(`Steam request failed with status ${r.status}`);
    err.status = r.status;
    throw err;
  }

  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error('Steam returned a non-JSON response.');
    err.status = 502;
    throw err;
  }
}

function startBackend() {
  const api = express();
  const PORT = Number(process.env.PORT || 8787);

  api.use(express.json({ limit: '25mb' }));
  api.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  api.get('/api/health', (_, res) => {
    res.json({ ok: true, service: 'cs2-inventory-tracker-desktop', dataDir: getDataDir() });
  });

  api.get('/api/steam/inventory/:steamId', async (req, res) => {
    try {
      const steamId = String(req.params.steamId || '').trim();
      const force = req.query.force === '1' || req.query.force === 'true';

      if (!/^\d{17}$/.test(steamId)) {
        return res.status(400).json({ error: 'Invalid SteamID64. Use the 17-digit SteamID64, not your profile name.' });
      }

      const cache = await readJson('inventory-cache.json', {});
      const cached = cache[steamId];
      const maxAgeMs = 30 * 60 * 1000;

      if (!force && cached && Date.now() - cached.fetchedAt < maxAgeMs) {
        return res.json({ ...cached.data, cache: { hit: true, ageSeconds: Math.round((Date.now() - cached.fetchedAt) / 1000) } });
      }

      let startAssetId = req.query.start_assetid || undefined;
      const assets = [];
      const descriptionsByKey = new Map();
      let more = true;
      let loops = 0;

      while (more && loops < 20) {
        const url = new URL(`https://steamcommunity.com/inventory/${steamId}/730/2`);
        url.searchParams.set('l', 'english');
        url.searchParams.set('count', '2000');
        if (startAssetId) url.searchParams.set('start_assetid', startAssetId);

        const data = await fetchSteamJson(url.toString());
        for (const asset of data.assets || []) assets.push(asset);
        for (const desc of data.descriptions || []) descriptionsByKey.set(`${desc.classid}:${desc.instanceid}`, desc);
        more = Boolean(data.more_items && data.last_assetid);
        startAssetId = data.last_assetid;
        loops += 1;
        if (more) await sleep(1200);
      }

      const payload = { success: 1, assets, descriptions: [...descriptionsByKey.values()], total_inventory_count: assets.length, fetchedAt: new Date().toISOString() };
      cache[steamId] = { fetchedAt: Date.now(), data: payload };
      await writeJson('inventory-cache.json', cache);

      res.json({ ...payload, cache: { hit: false } });
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message || 'Failed to fetch inventory. Confirm the profile inventory is public.' });
    }
  });

  api.get('/api/steam/price', async (req, res) => {
    const marketHashName = String(req.query.market_hash_name || '').trim();
    const force = req.query.force === '1' || req.query.force === 'true';
    if (!marketHashName) return res.status(400).json({ error: 'Missing market_hash_name' });

    const cache = await readJson('price-cache.json', {});
    const cached = cache[marketHashName];
    const maxAgeMs = 24 * 60 * 60 * 1000;
    if (!force && cached && Date.now() - cached.fetchedAt < maxAgeMs) return res.json({ ...cached, cached: true });

    try {
      const url = new URL('https://steamcommunity.com/market/priceoverview/');
      url.searchParams.set('appid', '730');
      url.searchParams.set('currency', '1');
      url.searchParams.set('market_hash_name', marketHashName);
      const data = await fetchSteamJson(url.toString());
      const payload = {
        market_hash_name: marketHashName,
        success: data.success,
        lowest_price: data.lowest_price || null,
        median_price: data.median_price || null,
        volume: data.volume || null,
        lowest_price_num: parseCurrency(data.lowest_price),
        median_price_num: parseCurrency(data.median_price),
        source: 'steam_priceoverview',
        fetchedAt: Date.now()
      };
      cache[marketHashName] = payload;
      await writeJson('price-cache.json', cache);
      res.json(payload);
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message || 'Price lookup failed' });
    }
  });

  api.get('/api/snapshots', async (_, res) => {
    res.json(await readJson('snapshots.json', []));
  });

  api.post('/api/snapshots', async (req, res) => {
    const snapshots = await readJson('snapshots.json', []);
    const snapshot = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...req.body };
    snapshots.push(snapshot);
    await writeJson('snapshots.json', snapshots.slice(-365));
    res.json(snapshot);
  });

  backendServer = api.listen(PORT, '127.0.0.1', () => {
    console.log(`CS2 desktop backend running internally at http://127.0.0.1:${PORT}`);
  });
}

async function waitForUrl(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    title: 'CS2 Inventory Tracker',
    backgroundColor: '#07111f',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    const ready = await waitForUrl('http://127.0.0.1:5173', 30000);
    if (!ready) {
      dialog.showErrorBox('Frontend did not start', 'Vite did not become available. Try running npm install, then npm run desktop:dev again.');
      return;
    }
    await win.loadURL('http://127.0.0.1:5173');
    return;
  }

  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fsSyncExists(indexPath)) {
    await win.loadFile(indexPath);
  } else {
    dialog.showErrorBox('Missing build', 'The desktop app could not find dist/index.html. Run npm run build first, or use the packaged executable from GitHub Actions.');
  }
}

function fsSyncExists(file) {
  try {
    require('node:fs').accessSync(file);
    return true;
  } catch {
    return false;
  }
}

app.whenReady().then(async () => {
  startBackend();
  await waitForUrl('http://127.0.0.1:8787/api/health', 15000);
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (backendServer) backendServer.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
