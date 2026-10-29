export * from './Accordion';
export * from './Accordion.types';

/*
    ## EXAMPLE:

    const faqItems = [
      { 
        id: '1', 
        title: '¿Cómo restablezco mi contraseña?', 
        content: 'Ve a configuración y haz click en...' 
      },
      { 
        id: '2', 
        title: '¿Es gratis?', 
        content: 'Sí, el plan básico es gratuito para siempre.',
        defaultOpen: true
      },
    ];

    // 1. Comportamiento Clásico (Uno a la vez)
    <Accordion items={faqItems} behavior="single" />

    // 2. Múltiples abiertos + Icono Plus + Estilo Unido
    <Accordion 
      items={faqItems} 
      behavior="multiple" 
      variant="plus" 
      joined 
    />
*/