import fs from 'fs';
import path from 'path';

// 1. Obtener el nombre del feature (ej: billing)
const featureName = process.argv[2];

if (!featureName) {
  console.error('❌ Error: Debes especificar el nombre del feature.');
  console.log('👉 Uso: npm run scaffold <nombre-feature>');
  process.exit(1);
}

// Utilidades de texto
const toPascalCase = (str) => str.charAt(0).toUpperCase() + str.slice(1);
const toCamelCase = (str) => str.toLowerCase();

const camelName = toCamelCase(featureName); // billing
const pascalName = toPascalCase(camelName); // Billing

console.log(`🏗️  Scaffolding feature: "${pascalName}"...`);

// ==========================================
// DEFINICIÓN DE RUTAS
// ==========================================
const rootDir = process.cwd();
const featureDir = path.join(rootDir, 'src', 'features', camelName);
const appPageDir = path.join(rootDir, 'src', 'app', '(dashboard)', camelName);

// ==========================================
// 1. CREAR ESTRUCTURA EN SRC/FEATURES
// ==========================================
const featureFolders = ['components', 'hooks', 'services', 'types'];

if (fs.existsSync(featureDir)) {
  console.warn(`⚠️  El feature "${camelName}" ya existe en src/features. Omitiendo creación de carpeta base.`);
} else {
  fs.mkdirSync(featureDir, { recursive: true });
}

featureFolders.forEach(folder => {
  fs.mkdirSync(path.join(featureDir, folder), { recursive: true });
});

// --- Archivo 1: Endpoints ---
const endpointsContent = `export const ${pascalName}Endpoints = {
  form: {
    create: '/${camelName}/form/create',
    update: (id: string) => \`/${camelName}/form/update?id=\${id}\`,
    delete: (id: string) => \`/${camelName}/form/delete?id=\${id}\`,
  },
  data: {
    list: '/${camelName}', 
    stats: '/${camelName}/dashboard/stats',
  },
  actions: {
    delete: (id: string) => \`/${camelName}/\${id}\`,
  }
};
`;
fs.writeFileSync(path.join(featureDir, 'services', `${camelName}.endpoints.ts`), endpointsContent);

// --- Archivo 2: Hook de Datos (Mock) ---
const hookContent = `import { useState, useEffect } from 'react';
import { RenderPieChart } from '@/types/backend/dashboard';
// import { apiClient } from '@/shared/api/api.client';
// import { ${pascalName}Endpoints } from '../services/${camelName}.endpoints';

export const use${pascalName}Dashboard = () => {
  const [stats, setStats] = useState<RenderPieChart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulación de carga
    const loadStats = async () => {
      try {
        // const { data } = await apiClient.get(${pascalName}Endpoints.data.stats);
        // setStats(data);
        
        // MOCK DATA (Reemplazar con llamada real)
        setTimeout(() => {
          setStats({
            id: 'chart-1',
            title: 'Estadísticas de ${pascalName}',
            keyLabel: 'label',
            keyValue: 'value',
            type: 'doughnut',
            data: [
              { label: 'Activos', value: 12 },
              { label: 'Pendientes', value: 5 },
              { label: 'Cancelados', value: 3 }
            ]
          });
          setLoading(false);
        }, 800);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  return { stats, loading };
};
`;
fs.writeFileSync(path.join(featureDir, 'hooks', `use${pascalName}Dashboard.ts`), hookContent);

// --- Archivo 3: Componente Stats ---
const statsComponentContent = `import { PieChart } from '@/shared/components/molecules/Charts/PieChart';
import { LoadingState } from '@/shared/components/molecules/LoadingState';
import { use${pascalName}Dashboard } from '../hooks/use${pascalName}Dashboard';

export const ${pascalName}Stats = () => {
  const { stats, loading } = use${pascalName}Dashboard();

  if (loading) return <LoadingState className="h-64" />;
  if (!stats) return null;

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-sm text-gray-500 uppercase">Resumen de ${pascalName}</h2>
        <PieChart config={stats} />
      </div>
    </div>
  );
};
`;
fs.writeFileSync(path.join(featureDir, 'components', `${pascalName}Stats.tsx`), statsComponentContent);

// --- Archivo 4: Componente Form Section ---
// NOTA: Ajusta la ruta de importación de DynamicForm según tu estructura final
const formComponentContent = `import { useDynamicForm } from '@/hooks/useDynamicForm';
import { DynamicForm } from '@/shared/components/organisms/DynamicForm/DynamicForm';
import { LoadingState } from '@/shared/components/molecules/LoadingState';
import { ${pascalName}Endpoints } from '../services/${camelName}.endpoints';

export const Create${pascalName}Section = () => {
  const { formStructure, submitForm, isLoading, isSubmitting } = useDynamicForm({
    endpoint: ${pascalName}Endpoints.form.create,
    onSuccessRedirect: '/${camelName}'
  });

  if (isLoading) return <LoadingState text="Cargando formulario..." />;
  if (!formStructure) return <div className="alert alert-error">Error cargando formulario. Revisa la conexión a la API.</div>;

  return (
    <div className="card bg-base-100 shadow-xl border border-base-200">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
           <h2 className="card-title">{formStructure.title}</h2>
           <div className="badge badge-primary badge-outline">Nuevo</div>
        </div>
        <div className="divider m-0"></div>
        <DynamicForm 
            formData={formStructure} 
            onSubmit={submitForm} 
            isLoading={isSubmitting} 
        />
      </div>
    </div>
  );
};
`;
fs.writeFileSync(path.join(featureDir, 'components', `Create${pascalName}Section.tsx`), formComponentContent);

// --- Archivo 5: Barrel File (index.ts) ---
const indexContent = `export * from './components/${pascalName}Stats';
export * from './components/Create${pascalName}Section';
`;
fs.writeFileSync(path.join(featureDir, 'index.ts'), indexContent);

console.log(`✅ Feature creado en: src/features/${camelName}`);


// ==========================================
// 2. CREAR ESTRUCTURA EN SRC/APP
// ==========================================
if (fs.existsSync(appPageDir)) {
  console.warn(`⚠️  La ruta src/app/(dashboard)/${camelName} ya existe.`);
} else {
  fs.mkdirSync(appPageDir, { recursive: true });
}

// --- Archivo Page.tsx ---
const pageContent = `'use client';

import { ${pascalName}Stats } from '@/features/${camelName}/components/${pascalName}Stats';
import { Create${pascalName}Section } from '@/features/${camelName}/components/Create${pascalName}Section';

export default function ${pascalName}Page() {
  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <header>
          <h1 className="text-3xl font-bold text-primary capitalize">${camelName}</h1>
          <p className="text-base-content/70">Gestión del módulo de ${camelName}.</p>
        </header>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <${pascalName}Stats />
          {/* Puedes añadir más widgets aquí, como una tabla de resumen */}
        </div>

        {/* Form Section */}
        <Create${pascalName}Section />

      </div>
    </div>
  );
}
`;
fs.writeFileSync(path.join(appPageDir, 'page.tsx'), pageContent);

console.log(`✅ Página creada en: src/app/(dashboard)/${camelName}/page.tsx`);
console.log(`🚀 Todo listo! Visita http://localhost:3000/${camelName}`);