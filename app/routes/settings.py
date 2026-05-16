"""Settings blueprint — system settings, wallpapers, quotes, backup."""
import os
import datetime
from flask import Blueprint, request, jsonify, send_file
from app import (
    JSON_DIR, get_settings, save_settings, get_all_quotes, get_lang,
    read_json, write_json, get_wallpaper_list, WALLPAPERS_DIR,
    BACKGROUNDS_DIR, DATA_DIR, DB_PATH, init_data_dirs,
)
from app.modules.logger import log

settings_bp = Blueprint("settings", __name__)


@settings_bp.route("/settings", methods=["GET"])
def api_get_settings():
    try:
        return jsonify(get_settings())
    except Exception as e:
        log("error", f"GET /settings failed: {e}")
        return jsonify({"error": "无法读取设置"}), 500


@settings_bp.route("/settings", methods=["PUT"])
def api_save_settings():
    try:
        data = request.get_json()
        if data:
            save_settings(data)
            return jsonify({"status": "success"})
        return jsonify({"status": "error", "message": "No data"}), 400
    except Exception as e:
        log("error", f"PUT /settings failed: {e}")
        return jsonify({"error": "无法保存设置"}), 500


@settings_bp.route("/quotes", methods=["GET"])
def api_get_quotes():
    try:
        return jsonify({"quotes": get_all_quotes()})
    except Exception as e:
        log("error", f"GET /quotes failed: {e}")
        return jsonify({"quotes": []})


@settings_bp.route("/quotes", methods=["PUT"])
def api_save_quotes():
    try:
        data = request.get_json()
        texts = data.get("texts", "")
        quotes = [q.strip() for q in texts.split("\n") if q.strip()]
        write_json(os.path.join(JSON_DIR, "quotes.json"), {"quotes": quotes})
        return jsonify({"status": "success", "count": len(quotes)})
    except Exception as e:
        log("error", f"PUT /quotes failed: {e}")
        return jsonify({"error": "无法保存语录"}), 500


@settings_bp.route("/wallpapers", methods=["GET"])
def api_get_wallpapers():
    try:
        return jsonify({"wallpapers": get_wallpaper_list()})
    except Exception as e:
        log("error", f"GET /wallpapers failed: {e}")
        return jsonify({"wallpapers": []})


@settings_bp.route("/wallpapers/upload", methods=["POST"])
def api_upload_wallpaper():
    try:
        f = request.files.get("file")
        if not f:
            return jsonify({"error": "No file"}), 400
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"):
            return jsonify({"error": "不支持的文件类型"}), 400
        import time
        os.makedirs(WALLPAPERS_DIR, exist_ok=True)
        filename = f"wallpaper_{int(time.time())}{ext}"
        filepath = os.path.join(WALLPAPERS_DIR, filename)
        f.save(filepath)
        return jsonify({"status": "success", "filename": filename})
    except OSError as e:
        log("error", f"Upload wallpaper failed (OS): {e}")
        return jsonify({"error": "壁纸保存失败，请检查磁盘空间"}), 500
    except Exception as e:
        log("error", f"Upload wallpaper failed: {e}")
        return jsonify({"error": "壁纸上​传失败"}), 500


@settings_bp.route("/wallpapers/<filename>", methods=["DELETE"])
def api_delete_wallpaper(filename):
    try:
        deleted = False
        # Try both directories
        for dirpath in (WALLPAPERS_DIR, BACKGROUNDS_DIR):
            filepath = os.path.join(dirpath, filename)
            if os.path.exists(filepath):
                os.remove(filepath)
                deleted = True
                log("info", f"Deleted wallpaper: {filepath}")
        if deleted:
            return jsonify({"status": "success"})
        return jsonify({"status": "error", "message": "文件不存在"}), 404
    except OSError as e:
        log("error", f"Delete wallpaper failed: {e}")
        return jsonify({"error": "删除壁纸失败"}), 500
    except Exception as e:
        log("error", f"Delete wallpaper failed: {e}")
        return jsonify({"error": str(e)}), 500


@settings_bp.route("/lang/<lang_code>", methods=["GET"])
def api_get_lang(lang_code):
    """Return language mapping JSON."""
    try:
        return jsonify(get_lang(lang_code))
    except Exception as e:
        log("error", f"Lang fetch failed: {e}")
        return jsonify({})


@settings_bp.route("/backup", methods=["GET"])
def download_backup():
    try:
        import tempfile
        import shutil
        from app.modules.database import get_db

        tmpdir = tempfile.mkdtemp()
        mirror = os.path.join(tmpdir, "data")
        os.makedirs(mirror, exist_ok=True)

        # Database: safe copy via VACUUM INTO
        os.makedirs(os.path.join(mirror, "database"), exist_ok=True)
        db_backup_path = os.path.join(mirror, "database", "main.db")
        try:
            db = get_db()
            db.execute("VACUUM INTO ?", (db_backup_path,))
            db.close()
        except Exception:
            if os.path.exists(DB_PATH):
                shutil.copy2(DB_PATH, db_backup_path)

        # Mirror subdirectories
        for subdir in ["backgrounds", "wallpapers", "icons", "json", "log"]:
            src = os.path.join(DATA_DIR, subdir)
            if os.path.isdir(src):
                try:
                    shutil.copytree(src, os.path.join(mirror, subdir))
                except Exception:
                    log("warning", f"Backup: failed to copy {subdir}")
                    pass

        zip_base = os.path.join(tmpdir, "mysearchpage_backup")
        zip_path = shutil.make_archive(zip_base, "zip", tmpdir, "data")

        try:
            shutil.rmtree(mirror)
        except Exception:
            pass

        return send_file(
            zip_path,
            mimetype="application/zip",
            as_attachment=True,
            download_name=f"mysearchpage_backup_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.zip",
        )
    except Exception as e:
        log("error", f"Backup failed: {e}")
        return jsonify({"error": "备份失败，请检查磁盘空间"}), 500
