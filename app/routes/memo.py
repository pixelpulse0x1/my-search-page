"""Memo blueprint — sticky note API with debounced save."""
from flask import Blueprint, request, jsonify
from app.modules.database import get_db
from app.modules.logger import log

memo_bp = Blueprint("memo", __name__)


@memo_bp.route("/memo", methods=["GET"])
def get_memo():
    try:
        db = get_db()
        row = db.execute("SELECT * FROM memo WHERE id=1").fetchone()
        db.close()
        if row:
            return jsonify({"content": row["content"] or "", "updated_at": row["updated_at"]})
        return jsonify({"content": "", "updated_at": ""})
    except Exception as e:
        log("error", f"GET /memo failed: {e}")
        return jsonify({"content": "", "updated_at": ""})


@memo_bp.route("/memo", methods=["PUT"])
def save_memo():
    try:
        data = request.get_json()
        content = data.get("content", "")
        db = get_db()
        db.execute(
            "INSERT INTO memo (id, content, updated_at) VALUES (1, ?, datetime('now','localtime')) "
            "ON CONFLICT(id) DO UPDATE SET content=?, updated_at=datetime('now','localtime')",
            (content, content),
        )
        db.commit()
        db.close()
        return jsonify({"status": "success"})
    except Exception as e:
        log("error", f"PUT /memo failed: {e}")
        return jsonify({"error": "保存便签失败"}), 500
