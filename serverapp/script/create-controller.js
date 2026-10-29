const fs = require('fs');
const path = require('path');

/**
 * Genera el contenido de la plantilla para un controlador de renderizado (MVC).
 * @param {string} featureName - El nombre de la feature (ej: 'user', 'wallet')
 */
const getControllerTemplate = (featureName) => {
  // Convierte 'user' -> 'User'
  const capitalizedName =
    featureName.charAt(0).toUpperCase() + featureName.slice(1);
  
  // Nombre de la clase (ej: 'UserRenderController')
  const className = `${capitalizedName}RenderController`;
  
  // Ruta base del controlador (ej: '/user')
  const routeName = featureName;
  
  // Ruta de la vista (ej: 'feature/private/user/page')
  // Esto coincide con tu estructura de 'views/'
  const viewPath = `feature/private/${featureName}/page`;

  return `import { Controller, Get, Render, UseGuards, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
// import { AuthenticatedGuard } from 'src/modules/auth/guards/authenticated.guard'; // (Descomenta cuando tengas tu Guard de sesión)

/**
 * Este controlador maneja el renderizado de vistas (MVC) para la entidad ${capitalizedName}.
 */
@ApiTags('MVC - ${capitalizedName}')
// @UseGuards(AuthenticatedGuard) // (Protegerá todas las rutas de este controlador)
@Controller('${routeName}')
export class ${className} {
  // Inyecta aquí los 'Services' o 'UseCases' que necesites
  constructor() {} 

  /**
   * @description Renderiza la página principal de ${featureName}.
   * @route GET /${routeName}
   */
  @Get()
  @Render('${viewPath}')
  public async get${capitalizedName}Page() {
    try {
      // 1. Aquí iría tu lógica para obtener datos
      // const users = await this.userService.findAll();

      // 2. Devuelve los datos que la vista .hbs necesita
      return { 
        pageTitle: 'Gestión de ${capitalizedName}s',
        items: [], // Deberías poblar esto con datos reales
      };
    } catch (error) {
      return { error: 'No se pudieron cargar los datos.' };
    }
  }

  /*
  // --- Ejemplo de ruta para una página de "Crear Nuevo" ---
  @Get('/create')
  @Render('feature/private/${featureName}/create') // Asumiendo que tienes una vista 'create.hbs'
  public getCreatePage() {
    return { 
      pageTitle: 'Crear Nuevo ${capitalizedName}' 
    };
  }

  // --- Ejemplo de ruta para una página de "Editar" ---
  @Get('/:id/edit')
  @Render('feature/private/${featureName}/edit') // Asumiendo que tienes una vista 'edit.hbs'
  public async getEditPage(@Param('id') id: string) {
    // const item = await this.userService.findById(id);
    return { 
      pageTitle: 'Editar ${capitalizedName}',
      item: {} // Poblar con el item encontrado
    };
  }
  */
}
`;
};

// -----------------------------------------------------------------------------
// SCRIPT PRINCIPAL
// -----------------------------------------------------------------------------
const main = () => {
  // 1. Define la ruta a tu carpeta 'modules'
  const modulesDir = path.join(__dirname, '..', 'src', 'modules');
  console.log(`🚀 Escaneando módulos en: ${modulesDir}`);
  let count = 0;
  let skipped = 0;

  try {
    // 2. Lee todas las carpetas dentro de 'modules'
    const features = fs.readdirSync(modulesDir);

    for (const featureName of features) {
      const modulePath = path.join(modulesDir, featureName);
      const stat = fs.statSync(modulePath);

      // 3. Solo procesa si es una carpeta
      if (stat.isDirectory()) {
        const newFileName = `${featureName}.render.controller.ts`;
        const newFilePath = path.join(modulePath, newFileName);

        console.log(`🔎 Detectado módulo [${featureName}].`);

        // 4. Verifica si el archivo ya existe para no sobrescribir
        if (fs.existsSync(newFilePath)) {
          console.log(`🟡 SKIPPED: El archivo ${newFileName} ya existe.`);
          skipped++;
        } else {
          // 5. Crea el contenido y escribe el archivo nuevo
          const fileContent = getControllerTemplate(featureName);
          fs.writeFileSync(newFilePath, fileContent);
          console.log(`✅ CREADO: ${newFileName} en src/modules/${featureName}/`);
          count++;
        }
      }
    }
    console.log(`\n✨ ¡Hecho! ${count} controladores creados. ${skipped} omitidos.`);
  } catch (error) {
    console.error('❌ Error durante la ejecución del script:', error);
  }
};

// Ejecutar el script
main();