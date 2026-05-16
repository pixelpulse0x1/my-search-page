"""Database module — SQLite with WAL mode, schema creation, seed data."""
import sqlite3
import os

DB_PATH = "/data/database/main.db"


def get_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn
    except sqlite3.Error as e:
        from app.modules.logger import log
        log("error", f"Database connection failed: {e}")
        raise


def init_db():
    try:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    except OSError:
        pass

    try:
        conn = get_db()
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS search_engines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                url_template TEXT NOT NULL,
                sort_order INTEGER DEFAULT 0,
                is_default INTEGER DEFAULT 0,
                is_enabled INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS bookmarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                url TEXT NOT NULL,
                open_new_tab INTEGER DEFAULT 1,
                icon_path TEXT DEFAULT '',
                sort_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS memo (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                content TEXT DEFAULT '',
                updated_at TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        """)

        # Seed default search engines
        existing_engines = conn.execute("SELECT COUNT(*) FROM search_engines").fetchone()[0]
        if existing_engines == 0:
            default_engines = [
                ("Google", "https://www.google.com/search?q={query}", 0, 1),
                ("Bing", "https://www.bing.com/search?q={query}", 1, 1),
                ("百度", "https://www.baidu.com/s?wd={query}", 2, 1),
                ("知乎", "https://www.zhihu.com/search?type=content&q={query}", 3, 0),
                ("小红书", "https://www.xiaohongshu.com/search_result?keyword={query}", 4, 0),
                ("博客园", "https://zzk.cnblogs.com/s?w={query}", 5, 0),
                ("bilibili", "https://search.bilibili.com/all?keyword={query}", 6, 0),
                ("维基百科", "https://zh.wikipedia.org/wiki/{query}", 7, 0),
            ]
            for name, url, sort, default in default_engines:
                conn.execute(
                    "INSERT INTO search_engines (name, url_template, sort_order, is_default) VALUES (?,?,?,?)",
                    (name, url, sort, default),
                )

        # Seed memo row
        existing_memo = conn.execute("SELECT COUNT(*) FROM memo").fetchone()[0]
        if existing_memo == 0:
            conn.execute("INSERT INTO memo (id, content) VALUES (1, '')")

        conn.commit()
        conn.close()
    except sqlite3.Error as e:
        from app.modules.logger import log
        log("error", f"Database init failed: {e}")
