// scripts/generate-crud-views.js

const fs = require('fs');
const path = require('path');

// --- Configuration ---
const baseDir = path.join(__dirname, '..', 'views', 'feature', 'private');
const crudFiles = ['page.hbs', 'unique.hbs', 'index.hbs', 'create.hbs', 'update.hbs'];
const standardHeader = `{{> private/slide}}

<div class="md:ml-64 transition-all duration-300">
{{> private/navbar}}

<main class="p-4">`;
const standardFooter = `
</main>
</div>`;

// --- Template Functions (getListPageTemplate, getUniquePageTemplate, etc.) ---
// ... (Las funciones de plantilla que ya tienes van aquí, no cambian) ...
// (Asegúrate de copiar las 5 funciones: getListPageTemplate, getUniquePageTemplate, getIndexPageTemplate, getCreatePageTemplate, getUpdatePageTemplate)

/**
 * Capitalizes the first letter of a string.
 */
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Generates content for the list view (page.hbs).
 */
const getListPageTemplate = (featureName) => {
    const capName = capitalize(featureName);
    return `${standardHeader}
        {{!-- START: Content for ${featureName}/page.hbs --}}
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
                <h1 class="text-2xl font-bold mb-2">{{ __ (concat 'common.dashboard.' '${featureName}') lang }}</h1>
            </div>
            <div>
                <a href="/${featureName}/create" class="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded transition">
                    <i class="bi bi-plus-lg mr-2"></i> {{ __ 'common.actions.create' lang }}
                </a>
            </div>
        </div>
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
            <p class="text-gray-600 dark:text-gray-400">List of ${capName} will appear here...</p>
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 mt-4"></table>
        </div>
        {{!-- END: Content for ${featureName}/page.hbs --}}${standardFooter}
`;
};
// ... (Añade las otras 4 funciones de plantilla aquí: unique, index, create, update)
const getUniquePageTemplate = (featureName) => { /*...*/ return `${standardHeader} UNIQUE CONTENT ${standardFooter}`; };
const getIndexPageTemplate = (featureName) => { /*...*/ return `${standardHeader} INDEX CONTENT ${standardFooter}`; };
const getCreatePageTemplate = (featureName) => { /*...*/ return `${standardHeader} CREATE CONTENT ${standardFooter}`; };
const getUpdatePageTemplate = (featureName) => { /*...*/ return `${standardHeader} UPDATE CONTENT ${standardFooter}`; };


// --- Mapping filenames to template functions ---
const templateMap = {
    'page.hbs': getListPageTemplate,
    'unique.hbs': getUniquePageTemplate,
    'index.hbs': getIndexPageTemplate,
    'create.hbs': getCreatePageTemplate,
    'update.hbs': getUpdatePageTemplate,
};

// --- Main Script Logic ---
const main = () => {
    // 1. Obtener el nombre de la feature desde los argumentos de la línea de comandos
    const featureName = process.argv[2]; // El tercer argumento (índice 2)

    // 2. Validar que se proporcionó un nombre
    if (!featureName) {
        console.error('❌ Error: Debes proporcionar el nombre de la feature como argumento.');
        console.error('Ejemplo: node scripts/generate-crud-views.js users');
        process.exit(1); // Salir con error
    }

    console.log(`🚀 Generando vistas CRUD para la feature [${featureName}]...`);

    // 3. Construir la ruta específica de la feature
    const featurePath = path.join(baseDir, featureName);

    try {
        // 4. Verificar si el directorio de la feature existe
        if (!fs.existsSync(featurePath) || !fs.statSync(featurePath).isDirectory()) {
            console.error(`❌ Error: El directorio para la feature '${featureName}' no existe en '${baseDir}'.`);
            console.error('Por favor, crea la carpeta primero.');
            process.exit(1);
        }

        let filesProcessed = 0;
        console.log(`\n🔎 Escribiendo archivos en: ${featurePath}`);

        // 5. Crear/Sobrescribir los archivos CRUD solo en esa carpeta
        for (const fileName of crudFiles) {
            const newFilePath = path.join(featurePath, fileName);
            const templateFunction = templateMap[fileName];

            if (templateFunction) {
                const fileContent = templateFunction(featureName);
                fs.writeFileSync(newFilePath, fileContent);
                console.log(`✅ ESCRITO/SOBREESCRITO: ${featureName}/${fileName}`);
                filesProcessed++;
            } else {
                console.warn(`❓ No se encontró función de plantilla para ${fileName}`);
            }
        }
        console.log(`\n✨ ¡Hecho! ${filesProcessed} archivos CRUD escritos/sobreescritos para [${featureName}].`);

    } catch (error) {
        console.error('❌ Error durante la ejecución del script:', error);
        process.exit(1);
    }
};

main();