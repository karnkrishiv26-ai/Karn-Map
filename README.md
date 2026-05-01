# 🌍 Karn MAP —Satellite Map and Tour Guide

> Click anywhere on Earth. Get Wikipedia, weather, POIs, routes & AI travel insights .

## Features
- **Satellite / Street / Terrain / Dark** map layers
- **Click any location** → reverse geocoding + info panel
- **Wikipedia popup** — auto-finds nearest article
- **Weather** — 3-day forecast (Open-Meteo, no key needed)
- **POI Discovery** — restaurants, museums, historic sites via OSM
- **Route Planner** — driving / cycling / walking via OSRM
- **AI Travel Guide** — Mistral AI via OpenRouter (free tier)
- **Elevation data** — Open-Elevation API
- **Search** — forward geocoding via Nominatim

## Run Locally (VS Code)

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



## Project Structure

```
satellite-tour-guide/
├── app.py                 
├── requirements.txt
├── Procfile               
├── runtime.txt
├── .env.example
├── templates/
│   └── index.html         
└── static/
    ├── css/style.css      
    └── js/app.js         
```
