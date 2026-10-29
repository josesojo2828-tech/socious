const path = require('path');
const fs = require('fs');

// Cargar dotenv antes de instanciar Prisma
const dotenvPathServer = path.join(__dirname, '../serverapp/.env');
const dotenvPathRoot = path.join(__dirname, '../.env');

if (fs.existsSync(dotenvPathServer)) {
  require('dotenv').config({ path: dotenvPathServer });
}
if (fs.existsSync(dotenvPathRoot)) {
  require('dotenv').config({ path: dotenvPathRoot });
}

// Fallback a DATABASE_URL por defecto si no está definido
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:11003/nutrigest?schema=public";
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateMenuImages() {
  console.log("🚀 Iniciando asignación de imágenes por IA (Pollinations AI) para los menús...");

  try {
    const menus = await prisma.menu.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        tags: true,
        imageUrl: true,
      }
    });

    console.log(`📋 Encontrados ${menus.length} menús en la base de datos.`);

    let updatedCount = 0;

    for (const menu of menus) {
      // Limpiamos el nombre para generar un buen prompt
      const cleanName = menu.name.trim();
      const tagsList = menu.tags ? menu.tags.split(',').slice(0, 3).join(' ') : '';
      
      // Prompt optimizado para fotografía gastronómica profesional
      const prompt = `gourmet professional food photography of ${cleanName} ${tagsList}, delicious healthy meal on a clean plate, studio lighting, top-down culinary shot, 4k resolution`;
      
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=600&nologo=true&seed=${updatedCount + 100}`;

      await prisma.menu.update({
        where: { id: menu.id },
        data: { imageUrl }
      });

      updatedCount++;
      if (updatedCount % 20 === 0 || updatedCount === menus.length) {
        console.log(`✅ ${updatedCount}/${menus.length} imágenes asignadas...`);
      }
    }

    console.log(`🎉 ¡Finalizado con éxito! ${updatedCount} menús actualizados con URLs de imágenes IA.`);
  } catch (error) {
    console.error("❌ Error generando imágenes para los menús:", error);
  } finally {
    await prisma.$disconnect();
  }
}

generateMenuImages();
