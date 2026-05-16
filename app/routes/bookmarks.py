"""Bookmarks blueprint — web navigation links CRUD."""
from flask import Blueprint, request, jsonify
from app.modules.database import get_db
from app.modules.logger import log

bookmarks_bp = Blueprint("bookmarks", __name__)


@bookmarks_bp.route("/bookmarks", methods=["GET"])
def list_bookmarks():
    try:
        db = get_db()
        rows = db.execute("SELECT * FROM bookmarks ORDER BY sort_order").fetchall()
        db.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        log("error", f"Bookmarks list failed: {e}")
        return jsonify({"error": "获取书签列表失败"}), 500


@bookmarks_bp.route("/bookmarks", methods=["POST"])
def create_bookmark():
    try:
        data = request.get_json()
        if not data or not data.get("title") or not data.get("url"):
            return jsonify({"error": "Title and URL are required"}), 400
        db = get_db()
        max_order = db.execute("SELECT MAX(sort_order) FROM bookmarks").fetchone()[0] or 0
        db.execute(
            """INSERT INTO bookmarks (title, description, url, open_new_tab, sort_order)
               VALUES (?,?,?,1,?)""",
            (data["title"].strip(), data.get("description", "").strip(),
             data["url"].strip(), max_order + 1),
        )
        db.commit()
        bookmark_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        db.close()
        return jsonify({"id": bookmark_id, "status": "success"})
    except Exception as e:
        log("error", f"Bookmark create failed: {e}")
        return jsonify({"error": "创建书签失败"}), 500


@bookmarks_bp.route("/bookmarks/<int:bookmark_id>", methods=["PUT"])
def update_bookmark(bookmark_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data"}), 400
        db = get_db()
        row = db.execute("SELECT * FROM bookmarks WHERE id=?", (bookmark_id,)).fetchone()
        if not row:
            db.close()
            return jsonify({"error": "Not found"}), 404

        fields = {}
        for k in ["title", "description", "url", "sort_order"]:
            if k in data:
                fields[k] = data[k].strip() if isinstance(data[k], str) else data[k]

        if fields:
            set_clause = ", ".join(f"{k}=?" for k in fields)
            values = list(fields.values()) + [bookmark_id]
            db.execute(f"UPDATE bookmarks SET {set_clause} WHERE id=?", values)
            db.commit()
        db.close()
        return jsonify({"status": "success"})
    except Exception as e:
        log("error", f"Bookmark update failed: {e}")
        return jsonify({"error": "更新书签失败"}), 500


@bookmarks_bp.route("/bookmarks/<int:bookmark_id>", methods=["DELETE"])
def delete_bookmark(bookmark_id):
    try:
        db = get_db()
        db.execute("DELETE FROM bookmarks WHERE id=?", (bookmark_id,))
        db.commit()
        db.close()
        return jsonify({"status": "success"})
    except Exception as e:
        log("error", f"Bookmark delete failed: {e}")
        return jsonify({"error": "删除书签失败"}), 500
