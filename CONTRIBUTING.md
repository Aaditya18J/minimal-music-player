# Contributing to Minimal Music Player

First off — thank you for taking the time to contribute!

## How to Contribute

### Report a Bug

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Browser/device info

### Suggest a Feature

Open an issue titled `[Feature] Your idea here` and describe what you'd like to see.

### Submit Code

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test it: `npm run dev` and verify everything works
5. Commit: `git commit -m "Add: your feature description"`
6. Push: `git push origin feature/your-feature-name`
7. Open a Pull Request against `main`

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── pages/Home.tsx          # Main player UI
│   │   ├── components/
│   │   │   ├── PlaylistPanel.tsx   # Queue & playlist side panel
│   │   │   ├── LyricsPanel.tsx     # Spotify-style lyrics editor
│   │   │   └── AudioVisualizer.tsx # Progress bar
│   │   ├── hooks/
│   │   │   ├── use-audio-player.ts # Core playback + scan logic
│   │   │   ├── use-playlists.ts    # Playlist CRUD (localStorage)
│   │   │   ├── use-lyrics.ts       # Lyrics per-track (localStorage)
│   │   │   └── use-history.ts      # Play history (API)
│   │   └── index.css               # Global styles + Tailwind
│   ├── public/
│   │   ├── manifest.json           # PWA manifest
│   │   └── sw.js                   # Service worker
│   └── index.html                  # Entry point
├── server/
│   ├── routes.ts                   # API endpoints
│   ├── storage.ts                  # In-memory storage interface
│   └── index.ts                    # Express server
└── shared/
    └── schema.ts                   # Shared types and Zod schemas
```

## Dev Setup

```bash
npm install
npm run dev
```

Backend runs on Express (port 5000), frontend on Vite (same port via proxy).

## Good First Issues

- Cover art extraction for Android `content://` URIs via the JS bridge
- Dark/light theme toggle with localStorage persistence
- Sleep timer (stop playback after X minutes)
- Equalizer presets using Web Audio API
- Gesture support: swipe left/right to skip tracks on mobile
- Last.fm scrobbling integration

## Code Style

- TypeScript everywhere, no `any` where avoidable
- Functional components + hooks only (no class components)
- Keep components small — split into files if over ~200 lines
- Use TailwindCSS utility classes, avoid inline styles
- Framer Motion for all animations

## Questions?

Open an issue or start a Discussion on GitHub.
