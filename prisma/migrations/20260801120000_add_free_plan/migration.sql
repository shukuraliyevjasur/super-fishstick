-- Add FREE to the WorkspacePlan enum.
ALTER TYPE "WorkspacePlan" ADD VALUE IF NOT EXISTS 'FREE' BEFORE 'STANDART';

-- New workspaces default to FREE. Existing workspaces keep their current plan.
ALTER TABLE "Workspace" ALTER COLUMN "plan" SET DEFAULT 'FREE';
