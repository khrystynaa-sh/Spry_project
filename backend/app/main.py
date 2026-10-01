from fastapi import FastAPI

from app.routers import meetings

app = FastAPI(title="Spry")
app.include_router(meetings.router)
