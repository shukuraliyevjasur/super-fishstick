-- CreateEnum
CREATE TYPE "WorkspacePlan" AS ENUM ('STANDART', 'PRO');

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "plan" "WorkspacePlan" NOT NULL DEFAULT 'STANDART';
