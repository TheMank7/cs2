# Fully Bundled Windows Executable Build

This version is designed to become a Windows `.exe` app.

## Why this helps

After building, you open the app like any other Windows program. You do **not** open a browser tab to a localhost URL.

The app still uses an internal loopback backend inside Electron, but it is hidden inside the desktop app and does not require you to type or use `localhost` in Chrome.

## Best build path if your work computer cannot use Node/npm

Use GitHub Actions:

1. Create a private GitHub repository.
2. Upload this whole folder to the repository.
3. Open the **Actions** tab.
4. Select **Build Windows Desktop Executable**.
5. Click **Run workflow**.
6. When it finishes, download the artifact named `CS2-Inventory-Tracker-Windows-Portable`.
7. Run the `.exe` inside the artifact.

## Notes

- No Node install is needed to run the built `.exe`.
- Node is only needed to build the app.
- GitHub Actions can do that build step for you.
- Your data is stored locally in the Windows app data folder.
- Steam may still rate-limit inventory/price requests, so use slow refresh settings.
