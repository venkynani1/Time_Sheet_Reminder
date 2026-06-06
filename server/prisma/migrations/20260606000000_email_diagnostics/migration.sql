ALTER TABLE "ReminderLog"
    ALTER COLUMN "memberId" DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS "gmailMessageId" TEXT,
    ADD COLUMN IF NOT EXISTS "gmailThreadId" TEXT,
    ADD COLUMN IF NOT EXISTS "recipientEmail" TEXT,
    ADD COLUMN IF NOT EXISTS "subject" TEXT,
    ADD COLUMN IF NOT EXISTS "providerResponseSummary" TEXT;
