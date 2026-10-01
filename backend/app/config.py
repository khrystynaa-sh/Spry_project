import os

DATABASE_URL: str = os.environ["DATABASE_URL"]

# Comma-separated browser origins allowed to call the API (empty in development:
# the Vite dev server proxies /api, so the browser never makes a cross-origin call).
CORS_ORIGINS: list[str] = [
    origin.strip() for origin in os.environ.get("CORS_ORIGINS", "").split(",") if origin.strip()
]
