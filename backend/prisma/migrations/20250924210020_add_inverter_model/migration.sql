-- CreateTable
CREATE TABLE "public"."Inverter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chargeCapacity" DOUBLE PRECISION NOT NULL,
    "dischargeCapacity" DOUBLE PRECISION NOT NULL,
    "batteryCapacity" DOUBLE PRECISION NOT NULL,
    "webUrl" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inverter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Inverter_userId_idx" ON "public"."Inverter"("userId");

-- AddForeignKey
ALTER TABLE "public"."Inverter" ADD CONSTRAINT "Inverter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
