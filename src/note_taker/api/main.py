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
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
origins = [origin.strip() for origin in cors_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(generate_router)
