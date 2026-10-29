export * from './InternalLink';
export * from './InternalLink.types';

/*
    ## EXAMPLE:

    // 1. Navegación básica
    <InternalLink href="/dashboard">
      Ir al Dashboard
    </InternalLink>

    // 2. Estilizado como enlace primario
    <InternalLink href="/profile" variant="primary">
      Editar Perfil
    </InternalLink>

    // 3. Enlace sutil (estilo hover)
    <InternalLink href="/terms" variant="hover" className="text-sm opacity-70">
      Términos de uso
    </InternalLink>

    // 4. Pasando props de Next.js (replace para no guardar historial)
    <InternalLink href="/login" replace variant="error">
      Cerrar Sesión
    </InternalLink>
*/