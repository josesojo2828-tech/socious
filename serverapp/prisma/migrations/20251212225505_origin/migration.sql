-- AlterTable
ALTER TABLE "Anthropometry" ADD COLUMN     "adjustedWeight" DECIMAL(65,30),
ADD COLUMN     "c_abdomen" DECIMAL(65,30),
ADD COLUMN     "c_arm_flexed" DECIMAL(65,30),
ADD COLUMN     "c_arm_relaxed" DECIMAL(65,30),
ADD COLUMN     "c_calf" DECIMAL(65,30),
ADD COLUMN     "c_chest" DECIMAL(65,30),
ADD COLUMN     "c_wrist" DECIMAL(65,30),
ADD COLUMN     "idealWeight" DECIMAL(65,30),
ADD COLUMN     "sittingHeight" DECIMAL(65,30),
ADD COLUMN     "usualWeight" DECIMAL(65,30);
