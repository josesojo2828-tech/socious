import fs from 'fs'
import path from 'path'

// Argumentos
const type = process.argv[2]; // atom, molecule, organism, template
const componentName = process.argv[3];

const validTypes = ['atom', 'molecule', 'organism', 'template'];

// Validaciones
if (!type || !validTypes.includes(type)) {
  console.error(`❌ Error: Tipo inválido. Usa: ${validTypes.join(', ')}`);
  console.log('👉 Uso: npm run generate:ui <tipo> <NombreComponente>');
  process.exit(1);
}

if (!componentName) {
  console.error('❌ Error: Falta el nombre del componente.');
  process.exit(1);
}

// Utilidades de texto
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pascalName = capitalize(componentName); // Ej: UserAvatar
const typeFolderName = type + 's'; // Ej: atoms

// Ruta: src/components/atoms/UserAvatar
const componentDir = path.join(process.cwd(), 'src', 'shared','components', typeFolderName, pascalName);

// Verificar existencia
if (fs.existsSync(componentDir)) {
  console.error(`❌ Error: El componente ${pascalName} ya existe en ${typeFolderName}.`);
  process.exit(1);
}

// Crear carpeta
fs.mkdirSync(componentDir, { recursive: true });

console.log(`🔨 Creando ${type}: ${pascalName}...`);

// ---------------------------------------------------------
// 1. Archivo de TIPOS (Nombre.types.ts)
// ---------------------------------------------------------
// Sugerencia: Usar "Props" como sufijo estándar de React
const typesContent = `import { ReactNode } from 'react';

export interface ${pascalName}Props {
  children?: ReactNode;
  className?: string;
  // Agrega tus props personalizadas aquí
  // variant?: 'primary' | 'secondary';
}
`;

const typesFileName = `${pascalName}.types.ts`;
fs.writeFileSync(path.join(componentDir, typesFileName), typesContent);
console.log(`   📄 Generado: ${typesFileName}`);

// ---------------------------------------------------------
// 2. Archivo del COMPONENTE (Nombre.tsx)
// ---------------------------------------------------------
const componentContent = `import { ${pascalName}Props } from './${pascalName}.types';

export const ${pascalName} = ({ children, className = '' }: ${pascalName}Props) => {
  return (
    <div className={className}>
      {/* ${type} implementation: ${pascalName} */}
      {children || '${pascalName} Component'}
    </div>
  );
};
`;

const componentFileName = `${pascalName}.tsx`;
fs.writeFileSync(path.join(componentDir, componentFileName), componentContent);
console.log(`   📄 Generado: ${componentFileName}`);

// ---------------------------------------------------------
// 3. Archivo ÍNDICE (index.ts)
// ---------------------------------------------------------
// Exportamos tanto el componente como sus tipos
const indexContent = `export * from './${pascalName}';
export * from './${pascalName}.types';
`;

fs.writeFileSync(path.join(componentDir, 'index.ts'), indexContent);
console.log(`   📄 Generado: index.ts`);

console.log(`✅ ¡Listo! Componente creado en src/components/${typeFolderName}/${pascalName}`);

/*
npm run generate:ui atom Button
npm run generate:ui atom IconButton
npm run generate:ui atom InternalLink
npm run generate:ui atom ExternalLink
npm run generate:ui atom CloseButton
npm run generate:ui atom OpenModalButton
npm run generate:ui atom CloseModalButton
npm run generate:ui atom Title
npm run generate:ui atom Paragrah
npm run generate:ui atom Text
npm run generate:ui atom Italic
npm run generate:ui atom Bold
npm run generate:ui atom Icon
npm run generate:ui atom Avatar
npm run generate:ui atom Image
npm run generate:ui atom Logo
npm run generate:ui atom Input
npm run generate:ui atom Textarea
npm run generate:ui atom Checkbox
npm run generate:ui atom Radio
npm run generate:ui atom Toggle
npm run generate:ui atom Badge
npm run generate:ui atom Spinner
npm run generate:ui atom Skeleton
npm run generate:ui atom ProgressBar
npm run generate:ui atom Divider
npm run generate:ui atom Overlay
npm run generate:ui molecule FormField
npm run generate:ui molecule SearchInput
npm run generate:ui molecule PasswordInput
npm run generate:ui molecule DropdownTrigger
npm run generate:ui molecule Select
npm run generate:ui molecule RenderSelect
npm run generate:ui molecule InputGroup
npm run generate:ui molecule Breadcrumb
npm run generate:ui molecule Pagination
npm run generate:ui molecule TabItem
npm run generate:ui molecule MenuItem
npm run generate:ui molecule Toast
npm run generate:ui molecule UserCard
npm run generate:ui molecule EmptyState
npm run generate:ui molecule LoadingState
npm run generate:ui molecule Tooltip
npm run generate:ui molecule ModalHeader
npm run generate:ui molecule ModalFooter
npm run generate:ui molecule ModalContent
npm run generate:ui molecule ModalActions
npm run generate:ui organism Navbar
npm run generate:ui organism PublicHeader
npm run generate:ui organism PrivateHeader
npm run generate:ui organism Sidebar
npm run generate:ui organism Footer
npm run generate:ui organism PublicFooter
npm run generate:ui organism PrivateFooter
npm run generate:ui organism Modal
npm run generate:ui organism Drawer
npm run generate:ui organism Card
npm run generate:ui organism HorizontalCard
npm run generate:ui organism Accordion
npm run generate:ui organism Tabs
npm run generate:ui organism Table
npm run generate:ui organism HeroSection
*/
