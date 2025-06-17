/*
  Warnings:

  - Added the required column `originalTicketGenDateTime` to the `JobOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "JobOrder" ADD COLUMN     "originalTicketGenDateTime" TIMESTAMP(3) NOT NULL;
