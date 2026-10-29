export * from './CloseButton';
export * from './CloseButton.types';

/*
    ## EXAMPLE:
    
    // Uso básico
    <CloseButton onClick={handleClose} />

    // Pequeño (ej: para un tag o badge)
    <CloseButton size="xs" />

    // En un Modal (Posicionado automáticamente a la derecha)
    <div className="modal-box relative">
       <CloseButton absolute onClick={closeModal} />
       <h3>Título del Modal</h3>
       <p>Contenido...</p>
    </div>
*/