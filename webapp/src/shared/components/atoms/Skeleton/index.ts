export * from './Skeleton';
export * from './Skeleton.types';

/*
    ## EXAMPLE:

    // 1. Avatar Loading
    <Skeleton variant="circle" className="w-12 h-12" />

    // 2. Card Loading (Ejemplo compuesto)
    <div className="flex flex-col gap-4 w-52">
      // Imagen de la card
      <Skeleton variant="rect" className="h-32 w-full rounded-lg" />
      
      // Título
      <Skeleton variant="text" className="h-4 w-28" />
      
      // Descripción (2 líneas)
      <Skeleton variant="text" className="h-4 w-full" />
      <Skeleton variant="text" className="h-4 w-full" />
    </div>

    // 3. Botón cargando
    <Skeleton variant="text" className="h-10 w-32" />
*/