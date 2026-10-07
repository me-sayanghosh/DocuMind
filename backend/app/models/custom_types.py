import json
from typing import Any, List, Optional
from sqlalchemy.types import TypeDecorator, TEXT
from pgvector.sqlalchemy import Vector


class CompatibleVector(TypeDecorator):
    """
    Uses pgvector's Vector(dim) on PostgreSQL, and JSON text on SQLite.
    """
    impl = TEXT
    cache_ok = True

    def __init__(self, dim: int = 384, *args: Any, **kwargs: Any):
        super().__init__(*args, **kwargs)
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(Vector(self.dim))
        else:
            return dialect.type_descriptor(TEXT())

    def process_bind_param(self, value: Optional[List[float]], dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        return json.dumps(value)

    def process_result_value(self, value: Any, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        if isinstance(value, str):
            return json.loads(value)
        return value
