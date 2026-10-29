export * from './Divider';
export * from './Divider.types';

/*
    ## EXAMPLE:

    // Simple línea horizontal
    <Divider />

    // Con texto
    <Divider>O</Divider>

    // Con colores semánticos
    <Divider variant="primary">Sección Importante</Divider>

    // Alineación del texto
    <Divider position="start">Capítulo 1</Divider>

    // Vertical (Útil dentro de flex-row)
    <div className="flex w-full">
      <div className="grid h-20 flex-grow card bg-base-300 rounded-box place-items-center">A</div>
      
      <Divider orientation="vertical">VS</Divider>
      
      <div className="grid h-20 flex-grow card bg-base-300 rounded-box place-items-center">B</div>
    </div>
*/