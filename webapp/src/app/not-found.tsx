import Link from 'next/link';
import { MoveRight } from 'lucide-react'; // Usando lucide-react para el icono, o puedes usar tu propia librería

export default function NotFound() {
    return (
        // Contenedor principal con un ligero fondo grisáceo para que resalte el blanco
        <main className="flex min-h-screen w-full items-center justify-center bg-gray-50 py-20">

            {/* Grid de dos columnas, similar al Hero */}
            <div className="container mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2">

                {/* COLUMNA IZQUIERDA: Texto y CTAs */}
                <div className="flex flex-col items-start text-left">

                    {/* Badge superior (Estilo "Software de nutricionistas") */}
                    <div className="mb-6 inline-flex items-center rounded-full bg-nutriGreen-light px-4 py-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-nutriGreen-dark">
                            Error 404
                        </span>
                    </div>

                    {/* Titular principal (Estilo "Cansado de transcribir...") */}
                    <h1 className="text-4xl font-extrabold tracking-tight text-nutriDark sm:text-5xl lg:text-6xl">
                        Parece que te has <br className="hidden lg:block" />
                        {/* Palabra destacada en verde */}
                        <span className="text-nutriGreen">desviado</span> del camino.
                    </h1>

                    {/* Subtítulo */}
                    <p className="mt-6 max-w-lg text-lg leading-relaxed text-gray-600">
                        La página que buscas no existe o ha sido movida. No te preocupes, puedes regresar al panel de control y seguir transformando vidas.
                    </p>

                    {/* Botón CTA (Estilo "Comenzar Prueba Gratis") */}
                    <div className="mt-10 flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
                        <Link
                            href="/"
                            className="group inline-flex items-center justify-center rounded-full bg-nutriDark px-8 py-4 text-base font-bold text-white transition-all hover:bg-opacity-90 hover:shadow-lg"
                        >
                            <span>Volver al Inicio</span>
                            {/* Icono de flecha (necesita lucide-react o similar) */}
                            <MoveRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </Link>

                        {/* Botón secundario opcional */}
                        <Link
                            href="/contacto"
                            className="inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-bold text-nutriDark transition-all hover:bg-gray-100"
                        >
                            Reportar un problema
                        </Link>
                    </div>
                </div>

                {/* COLUMNA DERECHA: Elemento Visual */}
                <div className="relative mx-auto w-full max-w-lg lg:max-w-none">

                    {/* Tarjeta oscura principal (Estilo del dashboard en el hero) */}
                    <div className="relative z-10 overflow-hidden rounded-3xl bg-nutriCardBg p-8 shadow-2xl lg:p-12 aspect-[4/3] flex items-center justify-center flex-col">

                        {/* Elementos decorativos "flotantes" estilo Nutringest */}
                        <div className="absolute top-6 left-6 inline-flex items-center rounded-xl bg-white p-3 shadow-md">
                            <div className="h-8 w-8 rounded-full bg-nutriGreen flex items-center justify-center text-white font-bold">?</div>
                            <div className="ml-3">
                                <p className="text-xs text-gray-500">Estado</p>
                                <p className="text-sm font-bold text-nutriDark">Extraviado</p>
                            </div>
                        </div>

                        <div className="absolute bottom-6 right-6 inline-flex items-center rounded-xl bg-[#0F3F3F] border border-nutriGreen/30 p-3 shadow-md">
                            <div className="h-3 w-3 rounded-full bg-nutriGreen animate-pulse"></div>
                            <p className="ml-3 text-sm font-bold text-white">Buscando ruta...</p>
                        </div>

                        {/* El gran 404 central */}
                        <h2 className="text-[120px] font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-500 opacity-20 leading-none select-none">
                            404
                        </h2>
                        <h3 className="mt-4 text-2xl font-bold text-white">Página no encontrada</h3>
                        <p className="text-gray-400 text-center mt-2">No pudimos cargar los datos de esta sección.</p>

                        {/* Efecto de brillo verde de fondo dentro de la tarjeta */}
                        <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-nutriGreen/20 via-transparent to-transparent opacity-30 mix-blend-overlay"></div>
                    </div>

                    {/* Sombra/Brillo detrás de la tarjeta principal */}
                    <div className="absolute -inset-4 -z-10 blur-3xl bg-nutriGreen/20 opacity-50 rounded-[3rem]"></div>
                </div>
            </div>
        </main>
    );
}