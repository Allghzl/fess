# YouTube Music Sidecar

Minimal Python adapter for ytmusicapi (unauthenticated).

## Setup

pip install -r requirements.txt

## Run

uvicorn main:app --host 0.0.0.0 --port 8765

## Endpoints

GET /health
GET /search?q=query&limit=20
GET /track/{videoId}
