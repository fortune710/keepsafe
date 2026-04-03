import logging
from typing import Dict, Any
from opentelemetry._logs import set_logger_provider, get_logger
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from config import settings

# Configure the logger provider
logger_provider = LoggerProvider()
set_logger_provider(logger_provider)

posthog_token = settings.POSTHOG_API_KEY

# Create OTLP exporter with API key in header
otlp_exporter = OTLPLogExporter(
    endpoint=f"{settings.POSTHOG_URL}/i/v1/logs",
    headers={"Authorization": f"Bearer {posthog_token}"}
)

# Add processor
logger_provider.add_log_record_processor(
    BatchLogRecordProcessor(otlp_exporter)
)

handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
logging.getLogger().addHandler(handler)


class Logger:

    def __init__(self, name: str):
        self.logger = logging.getLogger(name)

    def debug(self, message: str, data: Dict[str, Any]):
        self.logger.debug(message, extra=data)

    def info(self, message: str, data: Dict[str, Any]):
        self.logger.info(message, extra=data)

    def warning(self, message: str, data: Dict[str, Any]):
        self.logger.warning(message, extra=data)

    def error(self, message: str, data: Dict[str, Any]):
        self.logger.error(message, extra=data)

    def critical(self, message: str, data: Dict[str, Any]):
        self.logger.critical(message, extra=data)
