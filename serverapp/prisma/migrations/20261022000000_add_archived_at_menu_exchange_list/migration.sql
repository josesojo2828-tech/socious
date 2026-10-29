-- Explicit archive state for menus and exchange lists.
-- Archived records stay in the database and remain assigned to plans; they are
-- hidden from active listings, cannot be edited, and are not shown to patients.
-- `deletedAt` keeps its meaning: permanently removed from every view.
ALTER TABLE "Menu" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "ExchangeList" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Menu_archivedAt_idx" ON "Menu"("archivedAt");
CREATE INDEX "ExchangeList_archivedAt_idx" ON "ExchangeList"("archivedAt");
