import os
from contextlib import contextmanager

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

from app.config import get_settings

settings = get_settings()
os.makedirs(os.path.dirname(settings.database_path) or ".", exist_ok=True)

engine = create_engine(
    f"sqlite:///{settings.database_path}",
    connect_args={"check_same_thread": False},
)

# Columns added to existing tables after the initial release. create_all()
# only creates missing tables, not missing columns on existing ones, so new
# nullable columns are patched in here instead of pulling in a full
# migration framework for a single-table SQLite app.
_ADDED_COLUMNS = [
    ("call", "call_type", "VARCHAR"),
]


def _apply_column_migrations() -> None:
    with engine.connect() as conn:
        for table, column, coltype in _ADDED_COLUMNS:
            existing = {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))}
            if column not in existing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}"))
        conn.commit()


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _apply_column_migrations()


def get_session():
    with Session(engine) as session:
        yield session


@contextmanager
def session_scope():
    with Session(engine) as session:
        yield session
