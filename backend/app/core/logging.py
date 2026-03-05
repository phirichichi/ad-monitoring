import logging
import sys
from datetime import datetime
from typing import Any, Dict

from pythonjsonlogger import jsonlogger

from app.core.config import settings

# ✅ exportable logger (importable everywhere)
logger = logging.getLogger("admon")


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(
        self,
        log_record: Dict[str, Any],
        record: logging.LogRecord,
        message_dict: Dict[str, Any],
    ) -> None:
        super().add_fields(log_record, record, message_dict)
        log_record["timestamp"] = datetime.utcnow().isoformat() + "Z"
        log_record["level"] = record.levelname
        log_record["logger"] = record.name
        log_record["service"] = settings.APP_NAME
        log_record["environment"] = str(settings.ENVIRONMENT)


def setup_logging() -> None:
    """Configure root logger (JSON) for the app."""
    level_name = getattr(settings, "LOG_LEVEL", "INFO")
    level = getattr(logging, str(level_name).upper(), logging.INFO)

    root = logging.getLogger()
    root.handlers = []
    root.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    formatter = CustomJsonFormatter("%(timestamp)s %(level)s %(name)s %(message)s")
    handler.setFormatter(formatter)

    root.addHandler(handler)