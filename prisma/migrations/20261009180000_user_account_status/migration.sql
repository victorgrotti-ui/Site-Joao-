-- Add account status and a session version.
-- Existing rows keep their id, email, password hash, name, role and timestamps.
-- active defaults to true and tokenVersion defaults to 0, so current sign-ins stay valid.
ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
