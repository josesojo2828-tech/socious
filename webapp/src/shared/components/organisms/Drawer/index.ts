export * from './Drawer';
export * from './Drawer.types';

/*
    ## EXAMPLE 1: Layout Principal (Nativo / Sin Estado React)
    // Ideal para el Sidebar de navegación global. 
    // El botón que lo abre debe ser <label htmlFor="my-drawer" ...>
    
    <Drawer 
      id="main-drawer"
      sideContent={<SidebarMenu />}
    >
      <Navbar />
      <main>Contenido...</main>
    </Drawer>


    ## EXAMPLE 2: Drawer de Filtros (Controlado con State)
    // Ideal cuando necesitas abrirlo tras una acción o cerrarlo desde código.
    
    const [isOpen, setIsOpen] = useState(false);

    <Drawer
      id="filter-drawer"
      position="end"
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      sideContent={<FilterForm />}
    >
      <Button onClick={() => setIsOpen(true)}>Filtros</Button>
      <ProductList />
    </Drawer>
*/