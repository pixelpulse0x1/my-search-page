"""my-search-page — Flask application factory."""
import os
import json
import shutil
import random
from flask import Flask

DATA_DIR = "/data"
DB_PATH = os.path.join(DATA_DIR, "database", "main.db")
BACKGROUNDS_DIR = os.path.join(DATA_DIR, "backgrounds")
WALLPAPERS_DIR = os.path.join(DATA_DIR, "wallpapers")
ICONS_DIR = os.path.join(DATA_DIR, "icons")
JSON_DIR = os.path.join(DATA_DIR, "json")
EXPORTS_DIR = os.path.join(DATA_DIR, "exports")

DEFAULT_BG_SRC = os.path.join(os.path.dirname(__file__), "static", "default_bg")
LANG_SRC = os.path.join(os.path.dirname(__file__), "lang")


def _ensure_dir(path):
    try:
        os.makedirs(path, exist_ok=True)
    except OSError:
        pass


def _copy_defaults(src_dir, dst_dir):
    try:
        if not os.path.isdir(src_dir):
            return
        _ensure_dir(dst_dir)
        for f in os.listdir(src_dir):
            try:
                src = os.path.join(src_dir, f)
                dst = os.path.join(dst_dir, f)
                if os.path.isfile(src) and not os.path.exists(dst):
                    shutil.copy2(src, dst)
            except (OSError, shutil.Error):
                pass
    except OSError:
        pass


def _init_json_file(filepath, default_content):
    try:
        if not os.path.exists(filepath):
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(default_content, f, ensure_ascii=False, indent=2)
    except (OSError, json.JSONEncodeError):
        pass


def init_data_dirs():
    for d in [os.path.join(DATA_DIR, "database"), BACKGROUNDS_DIR, WALLPAPERS_DIR,
              ICONS_DIR, JSON_DIR, EXPORTS_DIR, os.path.join(DATA_DIR, "log")]:
        _ensure_dir(d)

    # Seed default backgrounds (best-effort)
    try:
        if os.path.isdir(BACKGROUNDS_DIR) and not os.listdir(BACKGROUNDS_DIR):
            if os.path.isdir(DEFAULT_BG_SRC):
                _copy_defaults(DEFAULT_BG_SRC, BACKGROUNDS_DIR)
    except OSError:
        pass

    # Seed default lang file (best-effort)
    try:
        lang_dst = os.path.join(JSON_DIR, "lang_zh.json")
        if not os.path.exists(lang_dst) and os.path.isdir(LANG_SRC):
            lang_src = os.path.join(LANG_SRC, "zh.json")
            if os.path.isfile(lang_src):
                shutil.copy2(lang_src, lang_dst)
    except (OSError, shutil.Error):
        pass

    # Seed settings.json
    _init_json_file(os.path.join(JSON_DIR, "settings.json"), {
        "language": "zh",
        "wallpaper_mode": "random",     # "random" | "fixed"
        "wallpaper_fixed": "",          # filename of fixed wallpaper
        "wallpaper_interval": 1,        # wallpaper rotation interval in hours (0 = off)
        "bg_opacity": 0.05,             # main-content background alpha (0-1)
        "bg_blur": 2,                   # backdrop-filter blur in px
        "time_format": "24h",           # "24h" | "12h"
        "dark_mode": "auto",            # "light" | "dark" | "auto"
        "show_quotes": True,
        "show_music_player": True,
        "show_weather": True,
        "show_memo": True,
        "show_bookmarks": True,
        "quote_interval": 10,           # quote rotation interval in seconds
        "music_id": "6895409634",
        "music_server": "netease",
        "music_type": "playlist",
        "music_fixed": True,
        "music_autoplay": False,
        "music_order": "random",
        "music_volume": 0.7,
        "music_theme": "#2EA7E0",
        "music_preload": "auto",
        "music_list_folded": True,
        "weather_city": "",
        "weather_locked": False,
    })

    # Seed quotes.json
    _init_json_file(os.path.join(JSON_DIR, "quotes.json"), {
        "quotes": [
            "古人学问无遗力，少壮工夫老始成。纸上得来终觉浅，绝知此事要躬行。",
            "知止而后有定，定而后能静，静而后能安，安而后能虑，虑而后能得。",
            "物有本末，事有终始。知所先后，则近道矣。",
            "我大体上欢喜冷静、沉着、稳重、刚毅，以出世精神做入世事业，尊崇理性和意志，却也不菲薄情感和想象。",
            "念念不忘，必有回响",
            "苟有恒，何必三更眠、五更起；最无益，莫过一日曝、十日寒",
            "苟能发奋自立，则家塾可读书，即旷野之地，热闹之场，亦可读书，负薪牧豕，皆可读书。",
            "一日不读书，尘生其中；两日不读书，言语乏味；三日不读书，面目可憎。",
            "凡心所向，素履所往，生如逆旅，一苇以航。",
            "每一处风景都有它的故事，每一个人都是这故事的讲述者。",
            "岁月是一场有去无回的旅行，好的坏的都是风景。",
            "星光不问赶路人，时光不负有心人。",
        ]
    })


# JSON read/write helpers
def read_json(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError, OSError) as e:
        from app.modules.logger import log
        log("error", f"Failed to read {filepath}: {e}")
        return {}


def write_json(filepath, data):
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except OSError as e:
        from app.modules.logger import log
        log("error", f"Failed to write {filepath}: {e}")


def get_settings():
    path = os.path.join(JSON_DIR, "settings.json")
    settings = read_json(path)
    if not settings:
        settings = {
            "language": "zh",
            "wallpaper_mode": "random", "wallpaper_fixed": "", "wallpaper_interval": 1,
            "bg_opacity": 0.05, "bg_blur": 2, "time_format": "24h", "dark_mode": "auto",
            "show_quotes": True, "show_music_player": True, "show_weather": True,
            "show_memo": True, "show_bookmarks": True, "quote_interval": 10,
            "music_id": "6895409634", "music_server": "netease", "music_type": "playlist",
            "music_fixed": True, "music_autoplay": False, "music_order": "random",
            "music_volume": 0.7, "music_theme": "#2EA7E0", "music_preload": "auto",
            "music_list_folded": True, "weather_city": "", "weather_locked": False,
        }
    return settings


def save_settings(data):
    try:
        current = get_settings()
        current.update(data)
        write_json(os.path.join(JSON_DIR, "settings.json"), current)
    except Exception as e:
        from app.modules.logger import log
        log("error", f"Failed to save settings: {e}")


def get_lang(lang_code):
    """Load language mapping. Returns {} for 'en' (keys are English)."""
    if lang_code == "en":
        return {}
    filepath = os.path.join(JSON_DIR, f"lang_{lang_code}.json")
    if os.path.exists(filepath):
        return read_json(filepath)
    return {}


def get_all_quotes():
    path = os.path.join(JSON_DIR, "quotes.json")
    try:
        if os.path.exists(path):
            data = read_json(path)
            quotes = data.get("quotes", [])
            if quotes:
                return quotes
    except Exception:
        pass
    return []


def get_wallpaper_list():
    files = []
    valid_exts = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp")
    for dirpath in (WALLPAPERS_DIR, BACKGROUNDS_DIR):
        try:
            if os.path.isdir(dirpath):
                for f in sorted(os.listdir(dirpath)):
                    if os.path.splitext(f)[1].lower() in valid_exts:
                        files.append({
                            "filename": f,
                            "source": "uploaded" if dirpath == WALLPAPERS_DIR else "default",
                            "url": f"/data/wallpapers/{f}" if dirpath == WALLPAPERS_DIR else f"/data/backgrounds/{f}"
                        })
        except OSError:
            pass
    return files


def get_random_wallpaper():
    """Pick a random wallpaper, preferring user-uploaded ones."""
    try:
        settings = get_settings()
        if settings.get("wallpaper_mode") == "fixed" and settings.get("wallpaper_fixed"):
            return settings["wallpaper_fixed"], "fixed"
        wallpapers = get_wallpaper_list()
        if wallpapers:
            chosen = random.choice(wallpapers)
            return chosen["filename"], chosen["source"]
    except Exception:
        pass
    return None, None


def create_app():
    app = Flask(__name__)
    app.secret_key = os.environ.get("SECRET_KEY", os.urandom(24).hex())

    # Init directories (best-effort, never crashes)
    try:
        init_data_dirs()
    except Exception:
        pass

    # Init database (best-effort, never crashes)
    try:
        from app.modules.database import init_db
        init_db()
    except Exception:
        pass

    # Register blueprints
    from app.routes.main import main_bp
    from app.routes.search import search_bp
    from app.routes.settings import settings_bp
    from app.routes.bookmarks import bookmarks_bp
    from app.routes.memo import memo_bp
    from app.routes.weather import weather_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(search_bp, url_prefix="/api")
    app.register_blueprint(settings_bp, url_prefix="/api")
    app.register_blueprint(bookmarks_bp, url_prefix="/api")
    app.register_blueprint(memo_bp, url_prefix="/api")
    app.register_blueprint(weather_bp, url_prefix="/api")

    return app
