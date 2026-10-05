"""
YouTube Music sidecar adapter for Pinatmenfess.
Uses ytmusicapi (unauthenticated search — no Google account required).

Install: pip install ytmusicapi fastapi uvicorn
Run:     uvicorn main:app --port 8765
"""

import logging
import time
from typing import Optional

try:
    from fastapi import FastAPI, Query, HTTPException
    from ytmusicapi import YTMusic
except ImportError as e:
    raise SystemExit(f"Missing dependency: {e}. Run: pip install ytmusicapi fastapi uvicorn")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ytmusic-sidecar")

app = FastAPI(title="YTMusic Sidecar", version="1.0.0")
ytm = YTMusic()   # unauthenticated — no cookie/account needed

PRIORITY_VIDEO_TYPES = {"ATV", "OMV", "OFFICIAL_SOURCE_MUSIC"}

def _pick_thumbnail(thumbnails: list) -> Optional[str]:
    if not thumbnails:
        return None
    best = max(thumbnails, key=lambda t: t.get("width", 0))
    return best.get("url")

def _normalize(raw: dict) -> Optional[dict]:
    video_id = raw.get("videoId")
    if not video_id:
        return None
    artists = raw.get("artists") or []
    artist_str = ", ".join(a.get("name", "") for a in artists if a.get("name"))
    album_info = raw.get("album") or {}
    duration_s = raw.get("duration_seconds") or 0
    video_type = raw.get("videoType", "")
    is_official = video_type in PRIORITY_VIDEO_TYPES
    return {
        "provider":    "youtube_music",
        "trackId":     video_id,
        "title":       raw.get("title", ""),
        "artist":      artist_str or None,
        "album":       album_info.get("name") if isinstance(album_info, dict) else None,
        "artworkUrl":  _pick_thumbnail(raw.get("thumbnails", [])),
        "trackUrl":    f"https://music.youtube.com/watch?v={video_id}",
        "durationMs":  duration_s * 1000 if duration_s else None,
        "isAvailable": raw.get("isAvailable", True),
        "videoType":   video_type,
        "isOfficial":  is_official,
        # Preview: YouTube IFrame only
        "previewAvailable":    True,
        "previewType":         "youtube_iframe",
        "previewUrl":          None,
        "previewVideoId":      video_id,
        "previewStartMs":      0,
        "previewDurationMs":   30000,
        "license":             None,
        "licenseUrl":          None,
        "attributionText":     "YouTube Music",
        "attributionRequired": True,
        "explicit":            None,
        "providerLabel":       "YouTube Music",
    }

@app.get("/health")
def health():
    return {"status": "ok", "provider": "youtube_music"}

@app.get("/search")
def search(
    q: str = Query(..., min_length=2, max_length=200),
    limit: int = Query(20, ge=1, le=50),
    language: str = Query("en"),
    region: str = Query("ID"),
):
    t0 = time.monotonic()
    try:
        results = ytm.search(q, filter="songs", limit=min(limit * 2, 50))
    except Exception as e:
        log.error(f"ytmusicapi search error: {e}")
        return {"tracks": [], "total": 0, "hasMore": False, "latencyMs": 0}

    tracks = [n for r in results if (n := _normalize(r)) is not None]
    # Sort: official first
    tracks.sort(key=lambda t: (0 if t["isOfficial"] else 1, not t["isAvailable"]))
    tracks = tracks[:limit]

    return {
        "tracks":    tracks,
        "total":     len(tracks),
        "hasMore":   len(results) > limit,
        "latencyMs": round((time.monotonic() - t0) * 1000),
    }

@app.get("/track/{video_id}")
def get_track(video_id: str):
    if not video_id.isalnum() and not all(c in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-" for c in video_id):
        raise HTTPException(400, "Invalid video ID")
    try:
        results = ytm.search(f"https://music.youtube.com/watch?v={video_id}", filter="songs", limit=1)
        if results:
            n = _normalize(results[0])
            if n:
                return n
    except Exception as e:
        log.error(f"ytmusicapi get_track error: {e}")
    raise HTTPException(404, "Track not found")
