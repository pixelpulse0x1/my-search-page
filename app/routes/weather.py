"""Weather blueprint — config management only. Fetching is done in frontend."""
from flask import Blueprint, request, jsonify
from app import get_settings, save_settings
from app.modules.logger import log

weather_bp = Blueprint("weather", __name__)


@weather_bp.route("/weather-config", methods=["GET"])
def get_weather_config():
    """Return weather config (city, locked status) for frontend use."""
    try:
        settings = get_settings()
        return jsonify({
            "city": settings.get("weather_city", ""),
            "locked": settings.get("weather_locked", False),
        })
    except Exception as e:
        log("error", f"Weather config read: {e}")
        return jsonify({"city": "", "locked": False})


@weather_bp.route("/weather-config", methods=["PUT"])
def update_weather_config():
    """Save weather config (city lock/unlock)."""
    try:
        data = request.get_json()
        if data is None:
            return jsonify({"error": "No data"}), 400
        settings = get_settings()
        if "city" in data:
            settings["weather_city"] = data["city"].strip()
        if "locked" in data:
            settings["weather_locked"] = bool(data["locked"])
        save_settings(settings)
        return jsonify({"status": "success"})
    except Exception as e:
        log("error", f"Weather config save: {e}")
        return jsonify({"error": str(e)}), 500
