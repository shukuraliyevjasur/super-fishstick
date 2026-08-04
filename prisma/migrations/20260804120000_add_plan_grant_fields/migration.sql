-- Billing audit trail for workspace plans (P1 / D2).
--
-- All three are nullable with no default, so this is a metadata-only change on
-- an existing table: no row rewrite, no backfill, safe on a live database.
-- Existing workspaces keep plan = FREE with a null grant history, which is
-- accurate — nothing has ever written workspace.plan before now.
ALTER TABLE "Workspace" ADD COLUMN "planGrantedAt" TIMESTAMP(3);
ALTER TABLE "Workspace" ADD COLUMN "planGrantedBy" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "planExpiresAt" TIMESTAMP(3);

-- Supports the expiry sweep in the health-check cron, which looks for paid
-- workspaces past their expiry date.
CREATE INDEX "Workspace_planExpiresAt_idx" ON "Workspace"("planExpiresAt");
