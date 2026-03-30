# Sutradhar

**AI-Powered Monthly Content Calendar Generator for Social Media Creators**

Built for HackXtreme Hackathon. 100% local AI - runs entirely in your browser using RunAnywhere SDK. Zero cloud, zero API keys, works completely offline after first model load.

## What It Does

Sutradhar helps social media creators generate cohesive, month-long content calendars powered by on-device AI. All AI inference happens locally in your browser via WebAssembly and WebGPU - your data never leaves your device.

### Key Features

- **Smart Calendar Generation**: AI creates a coherent content series with interconnected post titles for the entire month
- **Full Post Content**: Generate complete posts with hooks, captions, hashtags, CTAs, and platform-specific tips
- **Series Continuity**: "Continue to Next Month" feature maintains narrative consistency across months
- **100% Local**: All AI runs in-browser using RunAnywhere SDK - no API keys, no cloud calls
- **Multi-Platform Support**: Instagram, LinkedIn, Twitter/X, YouTube, TikTok
- **Multi-Language**: English, Hindi, Hinglish, Spanish, French, German
- **Customizable Tone**: Casual, Professional, Witty, Inspirational, Educational
- **Offline-Ready**: Works without internet after first model download

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The LLM model (~250MB) will be downloaded on first run and cached in your browser's OPFS.

## User Flow

### Step 1: Onboarding
Fill in the form:
- **Niche**: e.g., "Personal Finance", "Fitness", "Tech"
- **Platform**: Instagram / LinkedIn / Twitter / YouTube / TikTok
- **Language**: English, Hindi, Hinglish, Spanish, French, German
- **Tone**: Casual / Professional / Witty / Inspirational / Educational
- **Posts per Month**: 4-30 posts (slider)
- **Posting Days**: Select days of the week

Click **"Generate My Calendar"**

### Step 2: Calendar View
- AI creates a coherent content series with interconnected titles
- Titles populate a visual monthly calendar grid
- Click any title card to generate full post content

### Step 3: Post Generation
- Auto-generates hook, caption, hashtags, CTA, and platform tip
- Streams output token-by-token for live ChatGPT-like feel
- Copy individual sections or copy all at once
- Regenerate if needed

### Step 4: Continue Series
- Click **"Continue to Next Month"** at the bottom
- AI maintains narrative consistency by reading series context from localStorage
- Next month's content logically builds on previous themes

## Architecture

### Tech Stack
- **Framework**: React 19 + TypeScript + Vite
- **AI**: RunAnywhere SDK (on-device LLM via WebGPU/WASM)
- **State**: Zustand with localStorage persistence
- **Styling**: Tailwind CSS
- **Dates**: date-fns

### AI Agents

#### Agent 1: Calendar Generator
- **Input**: Form data, current month, optional series context
- **Output**: JSON array of post titles for the month
- **Model**: LFM2 350M (250MB)

#### Agent 2: Post Content Generator  
- **Input**: Post title, date, form data
- **Output**: JSON with hook, caption, hashtags, CTA, platform tip
- **Features**: Streaming generation, platform-specific optimization

## Project Structure

```
src/
├── App.tsx                   # Main app with screen routing
├── runanywhere.ts            # RunAnywhere SDK initialization
├── store/
│   └── useStore.ts          # Zustand store (all app state)
├── services/
│   ├── calendarAgent.ts     # Agent 1: Calendar generation
│   └── postAgent.ts         # Agent 2: Post content generation
├── components/
│   ├── LoadingScreen.tsx    # Model download progress
│   ├── OnboardingForm.tsx   # User input form
│   ├── CalendarView.tsx     # Monthly calendar grid
│   └── PostModal.tsx        # Post content with streaming
└── styles/
    └── index.css            # Tailwind CSS
```

## Data Persistence

All data is stored in browser localStorage under key `sutradhar-storage`:
- **Series Context**: Series name, theme, last 3 titles, months completed
- **Generated Posts**: Cached by date to avoid regeneration
- **Form Configuration**: Niche, platform, language, tone, etc.
- **Calendar State**: Current month and post titles

## Code Examples

### Calendar Generation
```typescript
// src/services/calendarAgent.ts
const result = await TextGeneration.generate(prompt, {
  maxTokens: 1024,
  temperature: 0.7,
  systemPrompt: 'You are a professional social media content strategist. Always respond with valid JSON only.',
});

const titles = parseCalendarJSON(result.text);
```

### Streaming Post Generation
```typescript
// src/services/postAgent.ts
const { stream, result: resultPromise } = await TextGeneration.generateStream(prompt, {
  maxTokens: 1024,
  temperature: 0.8,
});

let accumulated = '';
for await (const token of stream) {
  accumulated += token;
  onToken(token, accumulated);  // Update UI in real-time
}
```

## Deployment

### Vercel (Recommended)

```bash
npm run build
npx vercel --prod
```

The included `vercel.json` sets required COOP/COEP headers for multi-threaded WASM.

### Other Platforms

Ensure your hosting sets these HTTP headers:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

Required for SharedArrayBuffer support (multi-threaded WASM).

## Browser Requirements

- Chrome 96+ or Edge 96+ (recommended: 120+)
- WebAssembly support
- SharedArrayBuffer (requires Cross-Origin Isolation headers)
- OPFS for model caching
- 4GB+ RAM recommended

## Performance

- **Model Size**: ~250MB (LFM2 350M)
- **Calendar Generation**: 5-10 seconds
- **Post Generation**: 10-20 seconds (streaming)
- **WebGPU**: 2-4x faster than CPU-only
- **Tokens/sec**: 15-30 (WebGPU), 5-10 (CPU)

## Documentation

- [RunAnywhere SDK Docs](https://docs.runanywhere.ai/web/introduction)
- [LiquidAI LFM2 Models](https://huggingface.co/LiquidAI)

## Credits

Built for **HackXtreme Hackathon** using:
- [RunAnywhere SDK](https://docs.runanywhere.ai/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand)

## License

MIT
