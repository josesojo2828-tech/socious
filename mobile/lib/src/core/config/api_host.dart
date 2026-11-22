/// ⚙️ EDITÁ ESTE ARCHIVO para apuntar la app a tu servidor.
///
/// Poné acá el DNS o la IP y el puerto del backend. Es el único lugar que hay
/// que tocar para el build normal (sin `--dart-define`).
///
/// Ejemplos:
/// - Emulador Android: `10.0.2.2` (la máquina host vista desde el emulador).
/// - Teléfono en la misma red: la IP LAN de tu máquina, ej. `192.168.1.10`.
/// - Producción: el dominio, ej. `api.socius.app` con `useHttps = true`.
///
/// Si compilás con `--dart-define=API_BASE_URL=https://...`, ese valor manda
/// sobre lo que esté escrito acá.
class ApiHost {
  const ApiHost._();

  /// DNS o IP del backend (sin `http://` ni puerto).
  static const String host = '10.0.2.2';

  /// Puerto del backend (NestJS escucha en 3001 por defecto).
  static const int port = 3001;

  /// `true` para https (producción). `false` para http local.
  static const bool useHttps = false;

  static String get baseUrl {
    final scheme = useHttps ? 'https' : 'http';
    return '$scheme://$host:$port';
  }
}
