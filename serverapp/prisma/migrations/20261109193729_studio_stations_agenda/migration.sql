-- CreateTable
CREATE TABLE "StudioStation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TABLE',
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioAppointment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "serviceId" TEXT,
    "stationId" TEXT,
    "staffId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioStation_organizationId_idx" ON "StudioStation"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioStation_organizationId_name_key" ON "StudioStation"("organizationId", "name");

-- CreateIndex
CREATE INDEX "StudioAppointment_organizationId_startAt_idx" ON "StudioAppointment"("organizationId", "startAt");

-- CreateIndex
CREATE INDEX "StudioAppointment_organizationId_stationId_startAt_idx" ON "StudioAppointment"("organizationId", "stationId", "startAt");

-- CreateIndex
CREATE INDEX "StudioAppointment_organizationId_staffId_startAt_idx" ON "StudioAppointment"("organizationId", "staffId", "startAt");

-- CreateIndex
CREATE INDEX "StudioAppointment_clientId_idx" ON "StudioAppointment"("clientId");

-- AddForeignKey
ALTER TABLE "StudioStation" ADD CONSTRAINT "StudioStation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioAppointment" ADD CONSTRAINT "StudioAppointment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioAppointment" ADD CONSTRAINT "StudioAppointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioAppointment" ADD CONSTRAINT "StudioAppointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioAppointment" ADD CONSTRAINT "StudioAppointment_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "StudioStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioAppointment" ADD CONSTRAINT "StudioAppointment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
