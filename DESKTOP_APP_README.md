# CS2 Inventory Tracker — Desktop App Upgrade

This version includes an Electron desktop wrapper so the tracker opens like a normal Windows app instead of living only in a browser tab.

## Easiest Windows launch

Double-click:

```text
Start-CS2-Inventory-Tracker-Windows.bat
```

The first launch will install dependencies with `npm install`. After that, the app opens in its own desktop window.

## Manual launch

```bash
npm install
npm run desktop:dev
```

This starts:

- the local backend on `http://localhost:8787`
- the Vite frontend on `http://localhost:5173`
- an Electron desktop window that loads the app

## Build a portable Windows app

Double-click:

```text
Build-Windows-Desktop-App.bat
```

Or run manually:

```bash
npm install
npm run dist:win
```

The generated `.exe` will appear in:

```text
release/
```

## Build a Windows installer

```bash
npm run dist:installer
```

## Notes

- The app still stores your data locally in your browser/Electron local storage.
- Steam pricing cache is stored in the local `data/` folder.
- No Steam login credentials are required for this version.
- Fetching inventory by SteamID64 still requires your Steam inventory to be public.
- Uploading your inventory JSON works even if the inventory is private.
