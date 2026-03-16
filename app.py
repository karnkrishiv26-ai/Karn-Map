from flask import Flask, render_template, request, jsonify
import requests
import os
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/reverse-geocode")
def reverse_geocode():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&addressdetails=1&accept-language=en"
    resp = requests.get(url, headers={"User-Agent": "SatelliteTourGuide/1.0"})
    return jsonify(resp.json())

@app.route("/api/geocode")
def geocode():
    q = request.args.get("q", "")
    url = f"https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=5&accept-language=en"
    resp = requests.get(url, headers={"User-Agent": "SatelliteTourGuide/1.0"})
    return jsonify(resp.json())

@app.route("/api/wikipedia")
def wikipedia():
    title = request.args.get("title", "")
    lat   = request.args.get("lat", "")
    lon   = request.args.get("lon", "")
    if lat and lon and not title:
        geo_url = f"https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=5000&gscoord={lat}|{lon}&gslimit=3&format=json"
        geo = requests.get(geo_url).json()
        pages = geo.get("query", {}).get("geosearch", [])
        if pages:
            title = pages[0]["title"]
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(title)}"
    resp = requests.get(url)
    if resp.status_code == 200:
        return jsonify(resp.json())
    return jsonify({"error": "Not found"}), 404

@app.route("/api/nearby-pois")
def nearby_pois():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    radius = request.args.get("radius", 1000)
    query = f"""[out:json][timeout:10];(node["tourism"](around:{radius},{lat},{lon});node["historic"](around:{radius},{lat},{lon});node["amenity"~"restaurant|cafe|museum"](around:{radius},{lat},{lon}););out body 15;"""
    resp = requests.post("https://overpass-api.de/api/interpreter", data=query)
    return jsonify(resp.json())

@app.route("/api/weather")
def weather():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=3"
    resp = requests.get(url)
    return jsonify(resp.json())

@app.route("/api/route")
def route():
    coords = request.args.get("coords", "")
    profile = request.args.get("profile", "driving")
    url = f"https://router.project-osrm.org/route/v1/{profile}/{coords}?overview=full&geometries=geojson&steps=true"
    resp = requests.get(url)
    return jsonify(resp.json())

@app.route("/api/ai-guide", methods=["POST"])
def ai_guide():
    data = request.json
    location = data.get("location", "Unknown")
    question = data.get("question", "Tell me about this place")
    prompt = f"You are an expert world travel guide. Location: {location}. Question: {question}. Give a vivid, engaging response in 3-4 sentences with 1 insider tip. Be enthusiastic but concise."

    if not OPENROUTER_API_KEY:
        return jsonify({"guide": f"🌍 Add a free OpenRouter API key in .env to unlock AI travel insights."})

    # List of free models to try in order
    FREE_MODELS = [
        "deepseek/deepseek-r1:free",
        "google/gemma-3-4b-it:free",
        "mistralai/mistral-small-3.1-24b-instruct:free",
        "meta-llama/llama-3.2-3b-instruct:free",
        "qwen/qwen-2.5-7b-instruct:free",
        "microsoft/phi-3-mini-128k-instruct:free",
        "huggingfaceh4/zephyr-7b-beta:free",
    ]

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://karn-map.onrender.com"
    }

    for model in FREE_MODELS:
        try:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}]
            }
            resp = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=15
            )
            if resp.status_code == 200:
                text = resp.json()["choices"][0]["message"]["content"]
                return jsonify({"guide": text})
        except:
            continue

    return jsonify({"guide": "AI guide temporarily unavailable. Please try again in a moment."})

@app.route("/api/elevation")
def elevation():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    url = f"https://api.open-elevation.com/api/v1/lookup?locations={lat},{lon}"
    try:
        resp = requests.get(url, timeout=5)
        return jsonify(resp.json())
    except:
        return jsonify({"results": [{"elevation": "N/A"}]})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
