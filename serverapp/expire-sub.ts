import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'demou25@example.com';

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.error(`❌ Usuario con email ${email} no encontrado.`);
        process.exit(1);
    }

    const result = await prisma.subscription.updateMany({
        where: { userId: user.id },
        data: {
            status: 'EXPIRED',
            endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Hace 30 días
            autoRenew: false,
        },
    });

    console.log(`✅ ¡Éxito! Se actualizaron ${result.count} suscripciones del usuario ${email} a estado EXPIRED.`);
}

main()
    .catch((e) => {
        console.error('❌ Error al ejecutar el script:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
