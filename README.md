# ☕ Freedom Cafe & Gaming Zone

Official website for Freedom Cafe & Gaming Zone, Lucknow.

**Stack:** React + Vite | Google Sheets (database) | ImgBB (image hosting)

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/your-username/freedom-cafe.git
cd freedom-cafe

# 2. Install dependencies
npm install

# 3. Copy env template and add your keys
cp .env.example .env
# Edit .env with your actual API keys

# 4. Start dev server
npm run dev
```

Opens at `http://localhost:3000`

## Deploy

```bash
npm run build    # Creates optimized build in dist/
npm run preview  # Preview the production build locally
```

### Vercel (Recommended)
1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `VITE_GOOGLE_SCRIPT_URL`
   - `VITE_IMGBB_API_KEY`
4. Deploy — done!

### Netlify
1. Push to GitHub
2. Import on [netlify.com](https://netlify.com)
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add env vars in site settings

## Backend Setup

See [SETUP-GUIDE.md](./SETUP-GUIDE.md) for full instructions on setting up:
- Google Sheets as a free database
- ImgBB for free image hosting
- Google Apps Script as the API layer

## Features

- 🎨 Dark neon gaming aesthetic
- 📱 Mobile-first, responsive design
- 📲 PWA — installable as a mobile app
- ⚙️ Built-in admin panel (no coding needed)
- ☕ Editable menu & pricing
- 🖼️ Gallery with image uploads
- ⭐ Customer reviews (public submission)
- 💬 Feedback system
- 📍 Expandable contact cards
- 📞 Direct dial enquiry button
- 🟢 Live open/closed status
