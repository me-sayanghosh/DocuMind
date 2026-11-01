"""Add refresh-token families and PostgreSQL tenant RLS policies."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_add_rls_and_refresh_families"
down_revision: Union[str, None] = "0002_add_workspace_invitations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _tenant_access(column: str) -> str:
    return (
        "current_setting('app.worker_mode', true) = 'true' OR "
        f"EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = {column} "
        "AND wm.user_id = current_setting('app.user_id', true)::uuid)"
    )


def upgrade() -> None:
    op.add_column(
        "refresh_tokens",
        sa.Column(
            "family_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.execute("UPDATE refresh_tokens SET family_id = id WHERE family_id IS NULL")
    op.alter_column("refresh_tokens", "family_id", nullable=False)
    op.create_index("refresh_tokens_family_idx", "refresh_tokens", ["family_id"])

    policies = {
        "documents": _tenant_access("documents.workspace_id"),
        "chunks": _tenant_access("chunks.workspace_id"),
        "conversations": _tenant_access("conversations.workspace_id"),
        "query_traces": _tenant_access("query_traces.workspace_id"),
        "usage_events": _tenant_access("usage_events.workspace_id"),
        "eval_runs": _tenant_access("eval_runs.workspace_id"),
        "messages": (
            "current_setting('app.worker_mode', true) = 'true' OR EXISTS ("
            "SELECT 1 FROM conversations c JOIN workspace_members wm "
            "ON wm.workspace_id = c.workspace_id "
            "WHERE c.id = messages.conversation_id "
            "AND wm.user_id = current_setting('app.user_id', true)::uuid)"
        ),
        "message_citations": (
            "current_setting('app.worker_mode', true) = 'true' OR EXISTS ("
            "SELECT 1 FROM messages m JOIN conversations c "
            "ON c.id = m.conversation_id JOIN workspace_members wm "
            "ON wm.workspace_id = c.workspace_id "
            "WHERE m.id = message_citations.message_id "
            "AND wm.user_id = current_setting('app.user_id', true)::uuid)"
        ),
        "eval_questions": (
            "current_setting('app.worker_mode', true) = 'true' OR EXISTS ("
            "SELECT 1 FROM eval_runs er JOIN workspace_members wm "
            "ON wm.workspace_id = er.workspace_id "
            "WHERE er.id = eval_questions.run_id "
            "AND wm.user_id = current_setting('app.user_id', true)::uuid)"
        ),
        "eval_results": (
            "current_setting('app.worker_mode', true) = 'true' OR EXISTS ("
            "SELECT 1 FROM eval_runs er JOIN workspace_members wm "
            "ON wm.workspace_id = er.workspace_id "
            "WHERE er.id = eval_results.run_id "
            "AND wm.user_id = current_setting('app.user_id', true)::uuid)"
        ),
    }

    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for table, expression in policies.items():
        policy_name = f"{table}_tenant_access"
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY {policy_name} ON {table} "
            f"USING ({expression}) WITH CHECK ({expression})"
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        for table in (
            "eval_results",
            "eval_questions",
            "message_citations",
            "messages",
            "eval_runs",
            "usage_events",
            "query_traces",
            "conversations",
            "chunks",
            "documents",
        ):
            op.execute(f"DROP POLICY IF EXISTS {table}_tenant_access ON {table}")
            op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

    op.drop_index("refresh_tokens_family_idx", table_name="refresh_tokens")
    op.drop_column("refresh_tokens", "family_id")
