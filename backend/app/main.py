from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .routers import auth, posts, ai, admin, financials, canvas
from .config import get_settings
import os

settings = get_settings()

# Create all tables
Base.metadata.create_all(bind=engine)

# Ensure posts and avatar dirs exist
os.makedirs(settings.posts_dir, exist_ok=True)
os.makedirs(os.path.join(settings.posts_dir, "..", "avatars"), exist_ok=True)

app = FastAPI(
    title="UnifyU API",
    description="Backend for UnifyU — international student community platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for avatars
avatars_dir = os.path.join(settings.posts_dir, "..", "avatars")
if os.path.exists(avatars_dir):
    app.mount("/avatars", StaticFiles(directory=avatars_dir), name="avatars")

app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(ai.router)
app.include_router(admin.router)
app.include_router(financials.router)
app.include_router(canvas.router)


@app.get("/")
def root():
    return {"status": "ok", "app": "UnifyU API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
