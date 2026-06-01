-- Creates the Supabase PostgreSQL tables required by the current Prisma schema.
-- Prisma generates UUID text values for Member, WeeklyStatus, and ReminderLog IDs.
BEGIN;

CREATE SCHEMA IF NOT EXISTS "public";
SET LOCAL search_path TO "public";

CREATE TABLE IF NOT EXISTS "Member" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL DEFAULT '',
    "telegramChatId" TEXT NOT NULL DEFAULT '',
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WeeklyStatus" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "weekStartDate" TEXT NOT NULL,
    "weekEndDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "lastReminderSentAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WeeklyStatus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReminderLog" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailTemplate" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Member_email_key" ON "Member"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Member_token_key" ON "Member"("token");
CREATE INDEX IF NOT EXISTS "WeeklyStatus_weekStartDate_idx" ON "WeeklyStatus"("weekStartDate");
CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyStatus_weekStartDate_memberId_key" ON "WeeklyStatus"("weekStartDate", "memberId");
CREATE INDEX IF NOT EXISTS "ReminderLog_sentAt_idx" ON "ReminderLog"("sentAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'WeeklyStatus_memberId_fkey'
          AND conrelid = '"WeeklyStatus"'::regclass
    ) THEN
        ALTER TABLE "WeeklyStatus"
            ADD CONSTRAINT "WeeklyStatus_memberId_fkey"
            FOREIGN KEY ("memberId")
            REFERENCES "Member"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END;
$$;

COMMIT;
