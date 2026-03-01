from fastapi import APIRouter
from fastapi.responses import RedirectResponse

router = APIRouter()

@router.get("/")
@router.head("/")
def root():
    return RedirectResponse(url="/health")

@router.get("/health")
def health_check():
    return {"status": "ok"}
