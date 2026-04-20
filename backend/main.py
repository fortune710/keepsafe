from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import webhooks
from routers import search
from routers import user
from routers import phone_number
from routers import monthly_dumps
from routers import entries
from config import settings
from schedulers.scheduler_manager import SchedulerManager
import logging

# Configure logging
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="KeepSafe Backend API",
    description="Backend API for KeepSafe with vector search capabilities",
    version="1.0.0"
)

# Initialize background schedulers
scheduler_manager = SchedulerManager()

allowed_hosts = ["*"] if settings.ENVIRONMENT == "development" else settings.ALLOWED_HOSTS

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_hosts,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(webhooks.router)
app.include_router(search.router)
app.include_router(user.router)
app.include_router(phone_number.router)
app.include_router(monthly_dumps.router)
app.include_router(entries.router)

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "KeepSafe Backend API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health():
    """
    Return the application's health status and current environment.
    
    Returns:
        dict: Mapping with keys:
            - "status": Service health indicator (e.g., "healthy").
            - "environment": Current environment name from settings.ENVIRONMENT.
    """
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT
    }

@app.on_event("startup")
async def startup_event():
    """
    Start application background tasks during startup.
    
    Initiates the configured scheduler manager to run background queue-processing jobs.
    """
    logger.info("Starting up application...")
    try:
        settings.validate_entry_report_email_config()
        scheduler_manager.start()
        logger.info("Application startup complete")
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}", exc_info=True)
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Stop background tasks on application shutdown."""
    logger.info("Shutting down application...")
    try:
        scheduler_manager.stop()
        logger.info("Application shutdown complete")
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}", exc_info=True)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL.lower()
    )
