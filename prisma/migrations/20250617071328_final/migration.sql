/*
  Warnings:

  - Made the column `ticketGenDateTime` on table `JobOrder` required. This step will fail if there are existing NULL values in that column.
  - Made the column `jobPrintDateTime` on table `JobOrder` required. This step will fail if there are existing NULL values in that column.
  - Made the column `materialIssueDateTime` on table `JobOrder` required. This step will fail if there are existing NULL values in that column.
  - Made the column `materialDeliveredDateTime` on table `JobOrder` required. This step will fail if there are existing NULL values in that column.
  - Made the column `originalTicketGenDateTime` on table `JobOrder` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "JobOrder" ALTER COLUMN "ticketGenDateTime" SET NOT NULL,
ALTER COLUMN "jobPrintDateTime" SET NOT NULL,
ALTER COLUMN "materialIssueDateTime" SET NOT NULL,
ALTER COLUMN "materialDeliveredDateTime" SET NOT NULL,
ALTER COLUMN "originalTicketGenDateTime" SET NOT NULL;
