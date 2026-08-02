-- Password sign-in. Nullable so existing magic-link accounts keep working;
-- they are prompted to set one on their next sign-in.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
