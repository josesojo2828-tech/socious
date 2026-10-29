export * from './Dropdown';
export * from './Dropdown.types';

/* USAGE:
   
   // 1. Con Botón Estándar
   <Dropdown 
     trigger={<Button>Opciones</Button>} 
     position="end"
   >
     <li><a>Editar</a></li>
     <li><a>Borrar</a></li>
   </Dropdown>

   // 2. Con Avatar (Usuario)
   <Dropdown trigger={<Avatar src="..." />} hover>
     <li><InternalLink href="/profile">Perfil</InternalLink></li>
     <li><button onClick={logout}>Salir</button></li>
   </Dropdown>
*/