-- M2: Backfill — copy existing Patient.nutritionistId into PatientNutritionist pivot
-- One PRIMARY row per non-deleted patient that has a nutritionistId.
-- assignedById stays NULL (origen del dato legacy no rastrea quién asignó).
-- id es TEXT -> gen_random_uuid()::text (requiere PG >= 13, disponible en Supabase).

INSERT INTO "PatientNutritionist" ("id", "patientId", "nutritionistId", "role", "isActive", "assignedById", "assignedAt")
SELECT gen_random_uuid()::text, p."id", p."nutritionistId", 'PRIMARY', true, NULL, NOW()
FROM "Patient" p
WHERE p."nutritionistId" IS NOT NULL
  AND p."deletedAt" IS NULL;