"""
main.py — FastAPI application for Synthetic Nation.

Runs at http://localhost:8000.
CORS is enabled for the local Vite dev server and containerized frontend.
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import simulation, causal, policy, validation


class Settings:
    def __init__(self) -> None:
        self.allowed_origins = os.environ.get(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,"
            "http://127.0.0.1:5173,"
            "http://localhost:3000,"
            "http://127.0.0.1:3000,"
            "http://localhost:8080,"
            "http://127.0.0.1:8080",
        )
        self.debug = os.environ.get("DEBUG", "true").lower() == "true"


settings = Settings()

app = FastAPI(
    title="Synterra API",
    description="Policy simulation engine with autonomous multi-tier agents",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url=None,
)

origins = [origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Accept"],
)

# Register routes
app.include_router(simulation.router, prefix="/api")
app.include_router(causal.router, prefix="/api")
app.include_router(policy.router, prefix="/api")
app.include_router(validation.router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    from backend.data.database import init_db
    await init_db()


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "synthetic-nation"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.api.main:app",
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", "8000")),
        reload=False,
    )
