export * from './Overlay';
export * from './Overlay.types';

/*
    ## EXAMPLE:

    // 1. Uso básico con Sidebar (Drawer)
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <>
        <Sidebar isOpen={isOpen} />
        
        // El Overlay se encarga de cerrar el sidebar al hacer click fuera
        <Overlay isVisible={isOpen} onClick={() => setIsOpen(false)} />
      </>
    )

    // 2. Con efecto Glassmorphism (Blur)
    <Overlay isVisible={showModal} blur />
    
    // 3. Z-Index personalizado (si tienes capas muy complejas)
    <Overlay isVisible={true} zIndex="z-[100]" />
*/