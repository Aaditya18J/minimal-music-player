# Minimal Music Player

> A pitch-black, ultra-minimalist music player that runs in your browser and on Android.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Open%20App-blueviolet?style=for-the-badge)](https://6e8dfe37-b6a0-42d6-968c-862b50a9a8fd-00-6o6uktxucspf.spock.replit.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-white?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-black?style=for-the-badge)](https://6e8dfe37-b6a0-42d6-968c-862b50a9a8fd-00-6o6uktxucspf.spock.replit.dev)

---

## Screenshots

> **[Try the live demo →](https://6e8dfe37-b6a0-42d6-968c-862b50a9a8fd-00-6o6uktxucspf.spock.replit.dev)**

*Want to add screenshots? Open the app, take one, and drop it into a GitHub Issue to get its URL — then open a PR adding it here!*

---

## What it looks like

```
╔══════════════════════════════════════╗
║           ██████████████            ║   ← Album art (full, any ratio)
║           ██  COVER  ██            ║
║           ██   ART   ██            ║
║           ██████████████            ║
║                                      ║
║        Song Title                    ║   ← Metadata from ID3 tags
║        Artist · Album                ║
║                                      ║
║   ◁10   ⏮   ⏵   ⏭   10▷           ║   ← ±10s skip, prev/next
║   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━      ║   ← Progress bar
║   🔀   🔁   ♡   ≡   🎵             ║   ← Shuffle, repeat, lyrics, queue
╚══════════════════════════════════════╝
```

Pure black. Pure white. Zero clutter.

---

## Features

### Core Player
| Feature | Details |
|---|---|
| Local file loading | Pick any audio files from your device |
| Album art | Reads embedded cover from ID3/FLAC/AAC tags — full image, any aspect ratio |
| Metadata | Title, artist, album auto-extracted — filename fallback |
| Animated disc | Spinning vinyl animation while playing |
| ±10s skip | Forward and rewind 10 seconds |
| Shuffle | True random shuffle across queue |
| Repeat | Off / Repeat All / Repeat One |

### Lyrics
| Feature | Details |
|---|---|
| Lyrics panel | Spotify-style slide-in editor |
| Per-song storage | Saved in browser localStorage per track |
| Edit in-place | Click to edit, saves automatically |

### Queue & Playlists
| Feature | Details |
|---|---|
| Full queue view | All loaded tracks with cover art |
| Search | Filter queue by title, artist, or album |
| Sort | Sort by Date Added / Title / Artist / Album |
| Playlists | Create named playlists, add/remove tracks |
| Playlist persistence | Saved in localStorage across sessions |

### Scanning
| Platform | How it works |
|---|---|
| Desktop (Chrome/Edge) | Folder picker → recursive scan of all audio files |
| Android APK | Native MediaStore bridge → scans all music on device |
| Other browsers | Manual file picker |

### PWA + Installable
- Install directly from browser on phone or desktop
- Works offline once installed
- Appears as a standalone app (no browser chrome)

---

## Supported Formats

`.mp3` `.flac` `.aac` `.ogg` `.wav` `.m4a` `.opus` `.wma` `.webm`

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript |
| Styling | TailwindCSS, Framer Motion |
| Routing | Wouter |
| Data fetching | TanStack Query v5 |
| Backend | Express.js, Node.js |
| ORM | Drizzle ORM |
| Metadata parsing | music-metadata |
| PWA | Service Worker + Web App Manifest |
| Build | Vite |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Run locally

```bash
git clone https://github.com/Aaditya18J/minimal-music-player.git
cd minimal-music-player
npm install
npm run dev
```

Open [http://localhost:5000](http://localhost:5000)

### Load music

1. Click **Load** → select MP3/FLAC/OGG/WAV/M4A files
2. *(Chrome/Edge on desktop)* Click **Scan Folder** → pick your music folder → all audio is scanned recursively
3. *(Android app)* Tap **Scan Device** → scans all music via MediaStore

---

## Android APK

This web app wraps into a native Android APK using Android Studio WebView.

See **[ANDROID_SETUP.md](ANDROID_SETUP.md)** for the complete guide including:
- WebChromeClient for file picker
- AndroidMusic JS bridge for device scanning
- Required permissions (READ_MEDIA_AUDIO, READ_EXTERNAL_STORAGE)
- Full MainActivity.kt code

---

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.tsx              # Main player UI
│   │   ├── components/
│   │   │   ├── PlaylistPanel.tsx     # Queue + playlist side panel
│   │   │   ├── LyricsPanel.tsx       # Lyrics editor panel
│   │   │   └── AudioVisualizer.tsx   # Animated progress bar
│   │   ├── hooks/
│   │   │   ├── use-audio-player.ts   # Core playback + scan logic
│   │   │   ├── use-playlists.ts      # Playlist CRUD (localStorage)
│   │   │   ├── use-lyrics.ts         # Lyrics per-track (localStorage)
│   │   │   └── use-history.ts        # Play history (API)
│   │   └── index.css
│   ├── public/
│   │   ├── manifest.json             # PWA manifest
│   │   └── sw.js                     # Service worker
│   └── index.html
├── server/
│   ├── routes.ts                     # API endpoints (/api/history)
│   ├── storage.ts                    # In-memory storage
│   └── index.ts                      # Express server entry
└── shared/
    └── schema.ts                     # Shared types + Zod schemas
```

---

## Contributing

All contributions are welcome — from bug fixes to new features.

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for full guidelines.

### Good first issues

- Add actual screenshots to this README
- Android: extract cover art from `content://` URIs via JS bridge  
- UI: Dark/light theme toggle  
- Feature: Sleep timer (stop after X minutes)
- Feature: Equalizer presets using Web Audio API
- Feature: Last.fm scrobbling
- Mobile: Swipe left/right to change track

### How to contribute

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make changes and test with `npm run dev`
4. Push and open a PR

---

## License

MIT — see [LICENSE](LICENSE). Use it, fork it, ship it.

---

Made by [Aaditya18J](https://github.com/Aaditya18J) · Contributions welcome
