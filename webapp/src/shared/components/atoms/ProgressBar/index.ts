export * from './ProgressBar';
export * from './ProgressBar.types';

/*
    ## EXAMPLE:

    // 1. Barra de progreso determinada (50%)
    <ProgressBar value={50} max={100} variant="primary" />

    // 2. Estado Indeterminado (Cargando infinito)
    // Simplemente no pases la prop 'value'
    <ProgressBar variant="accent" />

    // 3. Barra delgada de éxito
    <ProgressBar value={100} variant="success" size="xs" />

    // 4. Uso en una tarjeta de subida de archivos
    <div className="w-full max-w-xs">
      <div className="flex justify-between text-xs mb-1">
        <span>Subiendo...</span>
        <span>70%</span>
      </div>
      <ProgressBar value={70} variant="info" size="sm" />
    </div>
*/