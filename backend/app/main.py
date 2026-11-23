import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.api.v1 import api_router
from app.core.config import get_settings
from app.core.errors import DomainError
from app.db.session import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("howlat")

settings = get_settings()

app = FastAPI(
    title="Howlat API",
    version="1.0.0",
    description="Personal money & debt ledger. All balances are computed server-side from "
    "transactions and repayments; money is exchanged as decimal strings.",
    docs_url="/docs" if settings.app_env != "production" else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.app_env != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,  # bearer tokens in headers; no cookies
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
    expose_headers=["Content-Disposition"],
)


@app.exception_handler(DomainError)
async def domain_error_handler(_: Request, exc: DomainError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message, "code": exc.code})


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    errors = []
    for e in exc.errors():
        loc = [str(p) for p in e.get("loc", []) if p not in ("body", "query", "path")]
        errors.append({"field": ".".join(loc), "message": str(e.get("msg", "Invalid value")).removeprefix("Value error, ")})
    detail = errors[0]["message"] if len(errors) == 1 and not errors[0]["field"] else "Please check the highlighted fields"
    return JSONResponse(status_code=422, content={"detail": detail, "code": "validation_failed", "errors": errors})


@app.exception_handler(OperationalError)
async def db_down_handler(_: Request, exc: OperationalError):
    log.error("Database unavailable: %s", type(exc.orig).__name__ if exc.orig else "unknown")
    return JSONResponse(
        status_code=503,
        content={"detail": "The database is temporarily unavailable. Please retry shortly.", "code": "db_unavailable"},
    )


@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception):
    # Log the exception type only: messages can contain SQL parameters (financial data).
    log.error("Unhandled error: %s", type(exc).__name__, exc_info=False)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on our side.", "code": "server_error"})


@app.get("/health", tags=["meta"])
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}


app.include_router(api_router)
