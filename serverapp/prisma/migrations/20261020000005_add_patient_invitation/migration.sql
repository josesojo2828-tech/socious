-- S1 (patient-onboarding): invitación de un solo uso para que el paciente
-- defina su propia contraseña.
--
-- El token nunca se persiste en claro: la columna "tokenHash" guarda
-- únicamente el hash sha256 del token entregado por correo.
CREATE TABLE "PatientInvitation" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientInvitation_tokenHash_key" ON "PatientInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "PatientInvitation_patientId_idx" ON "PatientInvitation"("patientId");

-- CreateIndex
CREATE INDEX "PatientInvitation_userId_idx" ON "PatientInvitation"("userId");

-- CreateIndex
CREATE INDEX "PatientInvitation_expiresAt_idx" ON "PatientInvitation"("expiresAt");

-- AddForeignKey
ALTER TABLE "PatientInvitation" ADD CONSTRAINT "PatientInvitation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientInvitation" ADD CONSTRAINT "PatientInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientInvitation" ADD CONSTRAINT "PatientInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
