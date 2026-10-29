export * from './Input';
export * from './Input.types';

/*
    ## EXAMPLE:
    
    // 1. Básico
    <Input placeholder="Nombre completo" />

    // 2. Búsqueda (Ghost + Small)
    <Input variant="ghost" size="sm" placeholder="Buscar..." />

    // 3. Estado de Error
    <Input error placeholder="Email inválido" />

    // 4. Color semántico
    <Input color="primary" placeholder="Input enfocado en azul" />
    
    // 5. Controlado
    <Input 
      value={name} 
      onChange={(e) => setName(e.target.value)} 
    />
*/