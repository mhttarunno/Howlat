from fastapi import APIRouter

from app.api.v1 import auth, dashboard, people, repayments, reports, transactions

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(people.router)
api_router.include_router(transactions.router)
api_router.include_router(repayments.router)
api_router.include_router(dashboard.router)
api_router.include_router(reports.router)
