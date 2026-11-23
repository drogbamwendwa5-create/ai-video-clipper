# ai-video-clipper
Node.js CLI for turning local videos into vertical clips with captions

## Setup

Requires Node.js 20 or newer and FFmpeg/ffprobe on PATH.

```bat
npm ci
copy .env.example .env
```

Set `LLM_PROVIDER`, `LLM_MODEL`, and the matching provider API key in `.env`.

## Desktop UI

```bat
launch-desktop.bat
```

The UI runs locally at `http://127.0.0.1:4181`.

## CLI

```bat
npm run cli -- C:\Videos\podcast.mp4 --count 5 --min 20 --max 60 --out .\out
npm run cli -- C:\Videos\podcast.mp4 --dry-run --out .\out
npm run cli -- C:\Videos\podcast.mp4 --force --out .\out
npm run cli -- --url "https://www.youtube.com/watch?v=VIDEO_ID" --count 5 --out .\out
```

## Test

```bat
npm test
```
