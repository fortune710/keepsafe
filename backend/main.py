from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import webhooks
from routers import search
from routers import user
from config import settings
from services.notification_scheduler import NotificationScheduler
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="KeepSafe Backend API",
    description="Backend API for KeepSafe with vector search capabilities",
    version="1.0.0"
)

# Initialize notification scheduler
notification_scheduler = NotificationScheduler()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(webhooks.router)
app.include_router(search.router)
app.include_router(user.router)

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
    
    Initiates the module-level NotificationScheduler to run background notification jobs. Any exceptions raised while starting the scheduler are logged and not propagated.
    """
    logger.info("Starting up application...")
    try:
        notification_scheduler.start()
        logger.info("Application startup complete")
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}", exc_info=True)

@app.on_event("shutdown")
async def shutdown_event():
    """Stop background tasks on application shutdown."""
    logger.info("Shutting down application...")
    try:
        notification_scheduler.stop()
        logger.info("Application shutdown complete")
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}", exc_info=True)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development"
    )
