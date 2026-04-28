# CS2 Inventory Tracker MVP

A private, local-first web app for tracking the estimated value of a CS2 inventory.

## What it does now

- Uploads a Steam/CS2 inventory JSON export.
- Optionally fetches a public CS2 inventory by SteamID64.
- Joins `assets` to `descriptions` using `classid + instanceid`.
- Extracts item names, categories, exteriors, rarity, images, tradability, marketability, and inspect links.
- Pulls Steam Community Market `priceoverview` prices through a local backend proxy.
- Lets you manually override values for rare/float-sensitive skins.
- Lets you manually enter float, paint seed, paint index, and notes.
- Saves value snapshots to localStorage and to `data/snapshots.json`.
- Exports a CSV.

## What it intentionally does not do yet

This MVP does **not** log into Steam or use the CS2 Game Coordinator. That is intentional for safety. Float values can be added manually now, and the next backend phase can add a secure enrichment worker for CSFloat/Valve GC/local inspect-link decoding.

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

Backend runs at:

```text
http://localhost:8787
```

## How to use

### Option 1: Upload your inventory export

1. Open the app.
2. Enter your SteamID64 if you want inspect links populated.
3. Click **Upload Inventory JSON**.
4. Select your saved inventory export file.

### Option 2: Fetch public inventory

1. Make your Steam inventory public.
2. Enter your SteamID64.
3. Click **Fetch**.

## Pricing

Click **Refresh Top 25 Prices** first. This fetches prices for priority items and caches them for 6 hours in:

```text
data/price-cache.json
```

For large inventories, refresh in batches. Steam may throttle requests.

## Suggested next phase

Add `server/floatWorker.js` with this priority order:

1. Decode modern self-encoded inspect links locally with `@csfloat/cs-inspect-serializer`.
2. Fall back to a secure Valve Game Coordinator worker with `steam-user` + `globaloffensive`.
3. Use CSFloat API/listings data as a secondary source where appropriate.

Recommended fields to add:

- `floatValue`
- `paintSeed`
- `paintIndex`
- `patternName`
- `stickerValueEstimate`
- `liquidityScore`
- `costBasis`
- `unrealizedGainLoss`

## Data privacy note

The app stores data locally in your browser and in the local `data/` folder. Do not commit real inventory snapshots or credentials to GitHub.

---

## Desktop App Mode

This project now includes an Electron wrapper so you can open the tracker like a desktop app.

### Windows quick start

Double-click:

```text
Start-CS2-Inventory-Tracker-Windows.bat
```

### Manual desktop launch

```bash
npm install
npm run desktop:dev
```

### Build a portable `.exe`

```bash
npm run dist:win
```

The generated app will appear in the `release/` folder.
