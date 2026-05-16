"""Main routes — page rendering and header info."""
import os
import datetime
import random
from flask import Blueprint, render_template, jsonify, request
from app import (
    get_settings, get_all_quotes, get_wallpaper_list,
    get_random_wallpaper, BACKGROUNDS_DIR, WALLPAPERS_DIR, ICONS_DIR
)
from app.modules.database import get_db
from app.modules.logger import log

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    try:
        return render_template("index.html")
    except Exception:
        return "<h1>my-search-page</h1><p>Template loading failed.</p>", 500


@main_bp.route("/api/header-info")
def header_info():
    try:
        now = datetime.datetime.now()
        settings = get_settings()

        # Quote
        quotes = get_all_quotes()
        quote = random.choice(quotes) if quotes else ""

        # Wallpaper
        wallpaper_file, wallpaper_source = get_random_wallpaper()
        wallpaper_url = ""
        if wallpaper_file:
            if wallpaper_source == "uploaded" or settings.get("wallpaper_mode") == "fixed" and settings.get("wallpaper_fixed"):
                wp_path = os.path.join(WALLPAPERS_DIR, wallpaper_file)
                if os.path.exists(wp_path):
                    wallpaper_url = f"/data/wallpapers/{wallpaper_file}"
                else:
                    wallpaper_url = f"/data/backgrounds/{wallpaper_file}"
            else:
                wallpaper_url = f"/data/backgrounds/{wallpaper_file}"

        return jsonify({
            "time": {
                "hours": now.hour,
                "minutes": now.minute,
                "seconds": now.second,
                "year": now.year,
                "month": now.month,
                "day": now.day,
                "weekday": (now.isoweekday() % 7),
            },
            "quote": quote,
            "wallpaper_url": wallpaper_url if wallpaper_url else "",
            "settings": {
                "language": settings.get("language", "zh"),
                "bg_opacity": settings.get("bg_opacity", 0.05),
                "bg_blur": settings.get("bg_blur", 2),
                "time_format": settings.get("time_format", "24h"),
                "dark_mode": settings.get("dark_mode", "auto"),
                "show_quotes": settings.get("show_quotes", True),
                "show_music_player": settings.get("show_music_player", True),
                "show_weather": settings.get("show_weather", True),
                "show_memo": settings.get("show_memo", True),
                "show_bookmarks": settings.get("show_bookmarks", True),
                "wallpaper_mode": settings.get("wallpaper_mode", "random"),
                "wallpaper_fixed": settings.get("wallpaper_fixed", ""),
                "wallpaper_interval": settings.get("wallpaper_interval", 1),
                "quote_interval": settings.get("quote_interval", 10),
                "music_id": settings.get("music_id", "6895409634"),
                "music_server": settings.get("music_server", "netease"),
                "music_type": settings.get("music_type", "playlist"),
                "music_fixed": settings.get("music_fixed", True),
                "music_autoplay": settings.get("music_autoplay", False),
                "music_order": settings.get("music_order", "random"),
                "music_volume": settings.get("music_volume", 0.7),
                "music_theme": settings.get("music_theme", "#2EA7E0"),
                "music_preload": settings.get("music_preload", "auto"),
                "music_list_folded": settings.get("music_list_folded", True),
            }
        })
    except Exception as e:
        log("error", f"header-info failed: {e}")
        now = datetime.datetime.now()
        return jsonify({
            "time": {
                "hours": now.hour, "minutes": now.minute, "seconds": now.second,
                "year": now.year, "month": now.month, "day": now.day,
                "weekday": (now.isoweekday() % 7),
            },
            "quote": "",
            "wallpaper_url": "",
            "settings": {},
        })


@main_bp.route("/data/backgrounds/<path:filename>")
def serve_background(filename):
    from flask import send_from_directory
    try:
        return send_from_directory(BACKGROUNDS_DIR, filename)
    except Exception:
        return "", 404


@main_bp.route("/data/wallpapers/<path:filename>")
def serve_wallpaper(filename):
    from flask import send_from_directory
    try:
        return send_from_directory(WALLPAPERS_DIR, filename)
    except Exception:
        return "", 404


@main_bp.route("/data/icons/<path:filename>")
def serve_icon(filename):
    from flask import send_from_directory
    try:
        return send_from_directory(ICONS_DIR, filename)
    except Exception:
        return "", 404
