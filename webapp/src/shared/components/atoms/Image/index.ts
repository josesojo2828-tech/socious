export * from './Image';
export * from './Image.types';

/*
    ## EXAMPLE:
    
    import placeholderImg from '@/assets/placeholder.png';

    // 1. Uso estándar de next/image (con ancho/alto fijo)
    // Tailwind classes para redondear y sombra
    <Image 
       src="/uploads/product-1.jpg" 
       alt="Zapato Rojo"
       width={300}
       height={200}
       className="rounded-lg shadow-md object-cover"
    />

    // 2. Con Fallback automático
    // Si 'user.avatarUrl' falla, cargará '/images/default-user.png'
    <Image 
       src={user.avatarUrl} 
       fallbackSrc="/images/default-user.png"
       alt={user.name}
       width={64}
       height={64}
       className="rounded-full"
    />

    // 3. Uso con 'fill' (para contenedores responsivos)
    // Recuerda: el padre debe tener 'relative' y un tamaño definido.
    <div className="relative w-full h-64 rounded-xl overflow-hidden">
       <Image 
         src="/banners/hero.jpg"
         alt="Hero Banner"
         fill
         className="object-cover hover:scale-105 transition-transform" // Efecto zoom
       />
    </div>
*/