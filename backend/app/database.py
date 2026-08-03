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


def _migrate_sitemapping_table() -> None:
    """sitemapping originally matched extensions by string prefix
    (Call.internal_number.startswith(prefix)), which is wrong for numeric
    ranges: prefix "800" only matches numbers literally starting with
    "800" (800, 8000-8009), not the intended 800-899 block. Rebuilds the
    table with explicit range_start/range_end, backfilling each old
    prefix as its containing hundred-block."""
    with engine.connect() as conn:
        cols = {row[1] for row in conn.execute(text("PRAGMA table_info(sitemapping)"))}
        if not cols or "prefix" not in cols:
            return  # table doesn't exist yet (create_all will make it) or already migrated

        conn.execute(text("ALTER TABLE sitemapping RENAME TO sitemapping_old"))
        conn.execute(
            text(
                "CREATE TABLE sitemapping ("
                "id INTEGER PRIMARY KEY, "
                "range_start INTEGER NOT NULL, "
                "range_end INTEGER NOT NULL, "
                "site VARCHAR NOT NULL)"
            )
        )
        conn.execute(
            text(
                "INSERT INTO sitemapping (id, range_start, range_end, site) "
                "SELECT id, (CAST(prefix AS INTEGER)/100)*100, "
                "(CAST(prefix AS INTEGER)/100)*100 + 99, site FROM sitemapping_old"
            )
        )
        conn.execute(text("DROP TABLE sitemapping_old"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sitemapping_range_start ON sitemapping (range_start)"))
        conn.commit()


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _apply_column_migrations()
    _migrate_sitemapping_table()


def get_session():
    with Session(engine) as session:
        yield session


@contextmanager
def session_scope():
    with Session(engine) as session:
        yield session
