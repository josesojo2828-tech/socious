import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const patientId = '948b5857-d5b3-4e6f-8d6c-f24f2d640ddc';
    const history = await prisma.anthropometry.findMany({
      where: { patientId },
      orderBy: { date: "asc" },
    });
    
    const labels = history.map((h: any) =>
      new Date(h.date).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      })
    );

    const result = {
      labels,
      datasets: {
        weight: history.map((h: any) => Number(h.weight)),
        bmi: history.map((h: any) => Number(h.bmi || 0)),
        waist: history.map((h: any) => Number(h.waist || 0)),
        hip: history.map((h: any) => Number(h.hip || 0)),
        fatPercentage: history.map((h: any) => Number(h.fatPercentage || 0)),
        muscleMass: history.map((h: any) => Number(h.muscleMass || 0)),
        boneMass: history.map((h: any) => Number(h.boneMass || 0)),
        adiposeMass: history.map((h: any) => Number(h.adiposeMass || 0)),
        residualMass: history.map((h: any) => Number(h.residualMass || 0)),
        endomorphy: history.map((h: any) => Number(h.endomorphy || 0)),
        mesomorphy: history.map((h: any) => Number(h.mesomorphy || 0)),
        ectomorphy: history.map((h: any) => Number(h.ectomorphy || 0)),
      }
    };
    
    console.log("METRICS OUTPUT JSON:");
    console.log(JSON.stringify(result, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
