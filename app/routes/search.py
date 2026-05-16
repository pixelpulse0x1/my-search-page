"""Search engines CRUD API."""
from flask import Blueprint, request, jsonify
from app.modules.database import get_db
from app.modules.logger import log

search_bp = Blueprint("search", __name__)


@search_bp.route("/search-engines", methods=["GET"])
def list_engines():
    try:
        db = get_db()
        rows = db.execute(
            "SELECT * FROM search_engines WHERE is_enabled=1 ORDER BY sort_order"
        ).fetchall()
        db.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        log("error", f"Search engine API error: {e}")
        return jsonify({"error": "操作失败"}), 500


@search_bp.route("/search-engines", methods=["POST"])
def create_engine():
    try:
        data = request.get_json()
        if not data or not data.get("name") or not data.get("url_template"):
            return jsonify({"error": "Name and URL template are required"}), 400
        db = get_db()
        max_order = db.execute("SELECT MAX(sort_order) FROM search_engines").fetchone()[0] or 0
        db.execute(
            "INSERT INTO search_engines (name, url_template, sort_order, is_default) VALUES (?,?,?,?)",
            (data["name"].strip(), data["url_template"].strip(), max_order + 1, data.get("is_default", 0)),
        )
        db.commit()
        engine_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        db.close()
        return jsonify({"id": engine_id, "status": "success"})
    except Exception as e:
        log("error", f"Search engine API error: {e}")
        return jsonify({"error": "操作失败"}), 500


@search_bp.route("/search-engines/<int:engine_id>", methods=["PUT"])
def update_engine(engine_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data"}), 400
        db = get_db()
        row = db.execute("SELECT * FROM search_engines WHERE id=?", (engine_id,)).fetchone()
        if not row:
            db.close()
            return jsonify({"error": "Not found"}), 404

        fields = {}
        for k in ["name", "url_template", "is_default", "is_enabled", "sort_order"]:
            if k in data:
                fields[k] = data[k].strip() if isinstance(data[k], str) else data[k]

        if fields:
            set_clause = ", ".join(f"{k}=?" for k in fields)
            values = list(fields.values()) + [engine_id]
            db.execute(f"UPDATE search_engines SET {set_clause} WHERE id=?", values)
            db.commit()
        db.close()
        return jsonify({"status": "success"})
    except Exception as e:
        log("error", f"Search engine API error: {e}")
        return jsonify({"error": "操作失败"}), 500


@search_bp.route("/search-engines/<int:engine_id>", methods=["DELETE"])
def delete_engine(engine_id):
    try:
        db = get_db()
        db.execute("DELETE FROM search_engines WHERE id=?", (engine_id,))
        db.commit()
        db.close()
        return jsonify({"status": "success"})
    except Exception as e:
        log("error", f"Search engine API error: {e}")
        return jsonify({"error": "操作失败"}), 500


@search_bp.route("/search-engines/reorder", methods=["PUT"])
def reorder_engines():
    try:
        data = request.get_json()
        if not data or not isinstance(data.get("order"), list):
            return jsonify({"error": "order list required"}), 400
        db = get_db()
        for item in data["order"]:
            db.execute(
                "UPDATE search_engines SET sort_order=? WHERE id=?",
                (item["sort_order"], item["id"]),
            )
        db.commit()
        db.close()
        return jsonify({"status": "success"})
    except Exception as e:
        log("error", f"Search engine API error: {e}")
        return jsonify({"error": "操作失败"}), 500
