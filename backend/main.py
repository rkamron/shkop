# Entry point for the Shkop image processing API.
# Run with: uvicorn main:app --reload
from contextlib import asynccontextmanager

from fastapi import FastAPI

from routers import clothing


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Placeholder for startup/shutdown logic (e.g. DB pool, warm-up requests).
    yield


app = FastAPI(title="Shkop Image Processing API", lifespan=lifespan)

app.include_router(clothing.router)


@app.get("/health")
async def health() -> dict:
    # Simple liveness check — useful for deployment health probes.
    return {"status": "ok"}
