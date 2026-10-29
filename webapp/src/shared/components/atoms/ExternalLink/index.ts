export * from './ExternalLink';
export * from './ExternalLink.types';

/*
    ## EXAMPLE:
    
    // Básico (Color de texto heredado)
    <ExternalLink href="https://google.com">
      Ir a Google
    </ExternalLink>

    // Estilizado con Icono
    <ExternalLink href="https://docs.astro.build" variant="primary" showIcon>
      Leer Documentación
    </ExternalLink>

    // Solo hover underline (Sutil)
    <ExternalLink href="..." variant="hover" className="text-sm">
      Ver Términos y Condiciones
    </ExternalLink>
*/