# 🌍 TERRA — AI Satellite Tour Guide

> Click anywhere on Earth. Get Wikipedia, weather, POIs, routes & AI travel insights — all FREE.

## ✨ Features
- **Satellite / Street / Terrain / Dark** map layers
- **Click any location** → reverse geocoding + info panel
- **Wikipedia popup** — auto-finds nearest article
- **Weather** — 3-day forecast (Open-Meteo, no key needed)
- **POI Discovery** — restaurants, museums, historic sites via OSM
- **Route Planner** — driving / cycling / walking via OSRM
- **AI Travel Guide** — Mistral AI via OpenRouter (free tier)
- **Elevation data** — Open-Elevation API
- **Search** — forward geocoding via Nominatim

## 🚀 Run Locally (VS Code)

```bash
# 1. Clone / create project folder
cd satellite-tour-guide

# 2. Create virtual environment
python -m venv venv

# 3. Activate
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 4. Install
pip install -r requirements.txt

# 5. Set up env (optional — for AI guide)
cp .env.example .env
# Edit .env and add your free OpenRouter key

# 6. Run
python app.py
# Open http://localhost:5000
```

## 🔑 Free API Keys

| Service | URL | Notes |
|---------|-----|-------|
| OpenRouter (AI) | openrouter.ai | Free tier: Mistral 7B, Llama |
| All others | Built-in | Nominatim, Open-Meteo, OSRM, Overpass, Open-Elevation — ALL FREE, NO KEY |

## ☁️ Deploy FREE on Render.com

1. Push to GitHub: `git init && git add . && git commit -m "init" && git remote add origin YOUR_REPO && git push`
2. Go to render.com → New Web Service → Connect repo
3. Build: `pip install -r requirements.txt`
4. Start: `gunicorn app:app`
5. Add env var `OPENROUTER_API_KEY` in Render dashboard
6. Deploy! Free tier = always-on (spins down after 15min idle)

## ☁️ Deploy FREE on Railway.app (faster)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

## ☁️ Deploy FREE on Vercel (serverless)

Install vercel CLI and add `vercel.json`:
```json
{"builds": [{"src": "app.py", "use": "@vercel/python"}], "routes": [{"src": "/(.*)", "dest": "app.py"}]}
```

## 📁 Project Structure

```
satellite-tour-guide/
├── app.py                  # Flask backend (all API routes)
├── requirements.txt
├── Procfile               # For Heroku/Render
├── runtime.txt
├── .env.example
├── templates/
│   └── index.html         # Main UI
└── static/
    ├── css/style.css      # All styles
    └── js/app.js          # All frontend logic
```

## 🎯 All APIs Used (100% Free)

| API | Purpose | Key Required |
|-----|---------|-------------|
| Nominatim (OSM) | Geocoding & reverse geocoding | ❌ |
| Open-Meteo | Weather forecast | ❌ |
| Wikipedia REST | Article summaries | ❌ |
| Overpass API | POIs from OpenStreetMap | ❌ |
| OSRM | Routing (drive/bike/walk) | ❌ |
| Open-Elevation | Elevation data | ❌ |
| OpenRouter | AI travel guide (Mistral) | ✅ Free tier |
| ArcGIS/Esri | Satellite tiles | ❌ |
| CartoDB | Dark map tiles | ❌ |

## 10x MORE IMPRESSIVE (Upgrade Path)

- **Google Maps API** → Street View, Places Photos, Directions
- **Mapbox** → Custom 3D terrain, globe view, indoor maps  
- **OpenAI GPT-4o** → Richer AI travel stories
- **Booking.com API** → Real hotel prices
- **Skyscanner API** → Flight search
- **Unsplash API** → Location photography
- **Foursquare** → Venue recommendations & tips
