-- AlterTable
ALTER TABLE "JobOrder" ALTER COLUMN "ticketGenDateTime" DROP NOT NULL,
ALTER COLUMN "jobPrintDateTime" DROP NOT NULL,
ALTER COLUMN "materialIssueDateTime" DROP NOT NULL,
ALTER COLUMN "materialDeliveredDateTime" DROP NOT NULL,
ALTER COLUMN "originalTicketGenDateTime" DROP NOT NULL;
