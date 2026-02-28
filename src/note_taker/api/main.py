from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from note_taker.api.routes import router as api_router

app = FastAPI(
    title="Note Taker API",
    description="Backend API for the Note Taker application",
    version="0.1.0",
)

# Configure CORS for Next.js frontend
origins = [
    "http://localhost:3000",
    "https://active-recall-generator.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
