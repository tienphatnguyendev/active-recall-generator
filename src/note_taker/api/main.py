from dotenv import load_dotenv
load_dotenv()  # Load .env for local development

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from note_taker.api.routes import router as api_router
from note_taker.api.generate import router as generate_router

import os

app = FastAPI(
    title="Note Taker API",
    description="Backend API for the Note Taker application",
    version="0.1.0",
)

# Configure CORS for Next.js frontend
cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
raw_origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]

# Filter out wildcards and ensure valid protocols
validated_origins = []
for origin in raw_origins:
    if origin == "*":
        continue
    # Strip any trailing slashes from the origin
    origin = origin.rstrip("/")
    if origin.startswith(("http://", "https://")):
        validated_origins.append(origin)

# Fallback if no valid origins found
if not validated_origins:
    validated_origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=validated_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Allow any Vercel preview deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(generate_router)
