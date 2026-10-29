import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const patientId = '948b5857-d5b3-4e6f-8d6c-f24f2d640ddc';
    const history = await prisma.anthropometry.findMany({
      where: { patientId },
      orderBy: { date: "asc" },
    });
    console.log("HISTORY LENGTH:", history.length);
    for (const h of history) {
        console.log(`Date: ${h.date}, Weight: ${h.weight}, FatPct: ${h.fatPercentage}, Muscle: ${h.muscleMass}, Bone: ${h.boneMass}, Adipose: ${h.adiposeMass}, Residual: ${h.residualMass}, Endo: ${h.endomorphy}, Meso: ${h.mesomorphy}, Ecto: ${h.ectomorphy}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
