"""enforce audit_logs append-only with a trigger

Revision ID: 20261125_1000
Revises: 20261124_1200
Create Date: 2026-11-25 10:00:00

The audit trail must be immutable: no row may be changed or removed once
written. Revoking UPDATE/DELETE from the application role is not enough —
the service currently connects as a role with BYPASSRLS (and, in some
environments, superuser), which ignores both RLS policies and privilege
revokes. A trigger enforces the rule for every role except the owner of the
table itself, so the guarantee holds however the application connects.

TRUNCATE is also blocked: a truncated trail is indistinguishable from a
trail that never existed, which defeats the purpose of an audit log.
"""
from typing import Union

from alembic import op

revision: str = "20261125_1000"
down_revision: Union[str, None] = "20261124_1200"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    # Append-only enforcement. SECURITY INVOKER (the default) is deliberate:
    # the trigger simply raises, so it needs no elevated privilege.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.elektrix_audit_logs_immutable()
        RETURNS trigger
        LANGUAGE plpgsql AS $fn$
        BEGIN
            RAISE EXCEPTION
                'audit_logs is append-only: % is not permitted', TG_OP
                USING ERRCODE = 'insufficient_privilege';
        END;
        $fn$;
        """
    )

    op.execute(
        "DROP TRIGGER IF EXISTS audit_logs_no_update ON public.audit_logs"
    )
    op.execute(
        """
        CREATE TRIGGER audit_logs_no_update
        BEFORE UPDATE OR DELETE ON public.audit_logs
        FOR EACH ROW EXECUTE FUNCTION public.elektrix_audit_logs_immutable()
        """
    )
    op.execute(
        "DROP TRIGGER IF EXISTS audit_logs_no_truncate ON public.audit_logs"
    )
    op.execute(
        """
        CREATE TRIGGER audit_logs_no_truncate
        BEFORE TRUNCATE ON public.audit_logs
        FOR EACH STATEMENT EXECUTE FUNCTION public.elektrix_audit_logs_immutable()
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS audit_logs_no_truncate ON public.audit_logs")
    op.execute("DROP TRIGGER IF EXISTS audit_logs_no_update ON public.audit_logs")
    op.execute("DROP FUNCTION IF EXISTS public.elektrix_audit_logs_immutable()")
