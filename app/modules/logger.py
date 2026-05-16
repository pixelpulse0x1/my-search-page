"""Application logging with rotating file handler."""
import os
import logging
from logging.handlers import RotatingFileHandler

DATA_DIR = "/data"
LOG_DIR = os.path.join(DATA_DIR, "log")
_logger = None


def get_logger():
    global _logger
    if _logger is not None:
        return _logger

    try:
        os.makedirs(LOG_DIR, exist_ok=True)
        log_path = os.path.join(LOG_DIR, "app.log")

        _logger = logging.getLogger("mysearchpage")
        _logger.setLevel(logging.DEBUG)

        handler = RotatingFileHandler(
            log_path, maxBytes=10 * 1024 * 1024, backupCount=10, encoding="utf-8"
        )
        handler.setFormatter(logging.Formatter(
            "[%(asctime)s] [%(levelname)s] [%(filename)s:%(lineno)d] - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        ))
        _logger.addHandler(handler)
    except Exception:
        _logger = logging.getLogger("mysearchpage")
        _logger.setLevel(logging.WARNING)
    return _logger


def log(level, msg):
    try:
        logger = get_logger()
        if level == "debug":
            logger.debug(msg)
        elif level == "info":
            logger.info(msg)
        elif level == "warning":
            logger.warning(msg)
        elif level == "error":
            logger.error(msg)
    except Exception:
        pass
