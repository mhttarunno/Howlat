import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

MONEY = Numeric(14, 2)

LENT = "LENT"
BORROWED = "BORROWED"


def _pk() -> Mapped[uuid.UUID]:
    return mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )


def _created() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


def _updated() -> Mapped[datetime]:
    return mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = _pk()
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="BDT")
    theme: Mapped[str] = mapped_column(String(10), nullable=False, server_default="light")
    # Bumped on logout / password change; tokens carrying an older value are rejected.
    token_version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()

    __table_args__ = (
        Index("uq_users_email_lower", func.lower(email), unique=True),
        CheckConstraint("theme IN ('light','dark','system')", name="ck_users_theme"),
    )


class Person(Base):
    __tablename__ = "people"

    id: Mapped[uuid.UUID] = _pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(320))
    address: Mapped[str | None] = mapped_column(String(300))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint("user_id", "id", name="uq_people_user_id_id"),
        Index("ix_people_user_archived", "user_id", "archived_at"),
        Index("ix_people_user_name", "user_id", func.lower(name)),
    )


class Transaction(Base):
    """An original loan: money LENT to someone or BORROWED from someone. Never mutated by repayments."""

    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = _pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    person_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(16), nullable=False)
    amount: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_date: Mapped[date | None] = mapped_column(Date)
    description: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)
    idempotency_key: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    person: Mapped[Person] = relationship(lazy="joined")
    repayments: Mapped[list["Repayment"]] = relationship(
        back_populates="transaction", lazy="select", order_by="Repayment.repayment_date, Repayment.created_at"
    )

    __table_args__ = (
        # Composite FK: the person must belong to the SAME user, enforced by the database itself.
        ForeignKeyConstraint(
            ["user_id", "person_id"], ["people.user_id", "people.id"],
            ondelete="RESTRICT", name="fk_transactions_user_person",
        ),
        UniqueConstraint("user_id", "id", name="uq_transactions_user_id_id"),
        CheckConstraint("amount > 0", name="ck_transactions_amount_positive"),
        CheckConstraint("transaction_type IN ('LENT','BORROWED')", name="ck_transactions_type"),
        CheckConstraint(
            "expected_date IS NULL OR expected_date >= transaction_date", name="ck_transactions_expected_date"
        ),
        Index("ix_transactions_user_person", "user_id", "person_id"),
        Index("ix_transactions_user_date", "user_id", "transaction_date"),
        Index(
            "ix_transactions_user_expected",
            "user_id",
            "expected_date",
            postgresql_where=text("expected_date IS NOT NULL AND deleted_at IS NULL"),
        ),
        Index(
            "uq_transactions_user_idem",
            "user_id",
            "idempotency_key",
            unique=True,
            postgresql_where=text("idempotency_key IS NOT NULL"),
        ),
    )


class Repayment(Base):
    """One partial or full repayment against a Transaction. Each is stored separately."""

    __tablename__ = "repayments"

    id: Mapped[uuid.UUID] = _pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    transaction_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    amount: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    repayment_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(40))
    description: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)
    idempotency_key: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _updated()
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    transaction: Mapped[Transaction] = relationship(back_populates="repayments", lazy="joined")

    __table_args__ = (
        ForeignKeyConstraint(
            ["user_id", "transaction_id"], ["transactions.user_id", "transactions.id"],
            ondelete="RESTRICT", name="fk_repayments_user_transaction",
        ),
        CheckConstraint("amount > 0", name="ck_repayments_amount_positive"),
        Index("ix_repayments_transaction", "transaction_id"),
        Index("ix_repayments_user_date", "user_id", "repayment_date"),
        Index(
            "uq_repayments_user_idem",
            "user_id",
            "idempotency_key",
            unique=True,
            postgresql_where=text("idempotency_key IS NOT NULL"),
        ),
    )


class AuditLog(Base):
    """Append-only record of every change to financial data (create / update / delete)."""

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = _pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    action: Mapped[str] = mapped_column(String(16), nullable=False)
    before: Mapped[dict | None] = mapped_column(JSONB)
    after: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = _created()

    __table_args__ = (
        Index("ix_audit_user_entity", "user_id", "entity_type", "entity_id"),
        Index("ix_audit_user_created", "user_id", "created_at"),
    )
