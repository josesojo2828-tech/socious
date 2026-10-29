import * as path from 'path';
import fs from 'fs';

const dotenvPathServer = path.join(__dirname, '../.env');
const dotenvPathRoot = path.join(__dirname, '../../.env');

if (fs.existsSync(dotenvPathServer)) {
  require('dotenv').config({ path: dotenvPathServer });
}
if (fs.existsSync(dotenvPathRoot)) {
  require('dotenv').config({ path: dotenvPathRoot });
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMMUNITY_PERMISSIONS = [
  'COMMUNITY_BROWSE',
  'COMMUNITY_IMPORT',
  'COMMUNITY_PUBLISH',
  'CONDIMENT_LIST',
];

async function main() {
  console.log('🔍 Sincronizando permisos de comunidad para todos los usuarios...');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      subscriptions: {
        where: { status: 'ACTIVE' },
        include: { plan: true },
      },
    },
  });

  console.log(`👥 Procesando ${users.length} usuarios...`);

  let granted = 0;
  let revoked = 0;

  for (const user of users) {
    const activeSub = user.subscriptions[0];
    const isPremium =
      activeSub &&
      (activeSub.planId === 'Premium' ||
        activeSub.plan?.name?.toUpperCase() === 'PREMIUM');

    if (isPremium) {
      for (const permission of COMMUNITY_PERMISSIONS) {
        const existing = await prisma.userPermission.findFirst({
          where: {
            userId: user.id,
            organizationId: null,
            permission,
          },
        });
        if (!existing) {
          await prisma.userPermission.create({
            data: {
              userId: user.id,
              permission,
            },
          });
        }
        granted++;
      }
    } else {
      const res = await prisma.userPermission.deleteMany({
        where: {
          userId: user.id,
          permission: { in: COMMUNITY_PERMISSIONS },
        },
      });
      revoked += res.count;
    }
  }

  console.log(`✅ Sincronización completada:`);
  console.log(`   - ${granted} permisos de comunidad otorgados/verificados`);
  console.log(`   - ${revoked} permisos revocados de usuarios no-PREMIUM`);
}

main()
  .catch((e) => {
    console.error('❌ Error en backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
