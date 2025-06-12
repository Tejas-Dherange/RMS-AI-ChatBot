-- CreateTable
CREATE TABLE "JobOrder" (
    "id" SERIAL NOT NULL,
    "orgCode" TEXT NOT NULL,
    "ticketNo" TEXT NOT NULL,
    "jobOrderNo" TEXT NOT NULL,
    "printedBy" TEXT NOT NULL,
    "jobStatus" TEXT NOT NULL,
    "ticketGenDateTime" TIMESTAMP(3) NOT NULL,
    "jobPrintDateTime" TIMESTAMP(3) NOT NULL,
    "materialIssueDateTime" TIMESTAMP(3) NOT NULL,
    "materialDeliveredDateTime" TIMESTAMP(3) NOT NULL,
    "materialAckDateTime" TIMESTAMP(3) NOT NULL,
    "ticketStatus" TEXT NOT NULL,
    "remarks" TEXT,
    "ospJobs" TEXT,
    "gapTicketToPrint" DOUBLE PRECISION,
    "gapIssueToDelivery" DOUBLE PRECISION,
    "gapDeliveryToAck" DOUBLE PRECISION,
    "gapTicketToAck" DOUBLE PRECISION,
    "gapTicketToDelivery" DOUBLE PRECISION,
    "agingBucket" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobOrder_pkey" PRIMARY KEY ("id")
);
