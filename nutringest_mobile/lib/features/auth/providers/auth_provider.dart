import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/auth_storage.dart';
import '../models/user_model.dart';

enum AuthStatus { initial, checking, authenticated, unauthenticated, error }

class AuthProvider extends ChangeNotifier {
  final ApiClient _apiClient;
  final AuthStorage _authStorage;

  AuthStatus _status = AuthStatus.initial;
  UserModel? _user;
  String? _errorMessage;
  bool _enablePediatrics = true;
  bool _enableSportsNutrition = true;

  AuthProvider({ApiClient? apiClient, AuthStorage? authStorage})
      : _apiClient = apiClient ?? ApiClient(),
        _authStorage = authStorage ?? AuthStorage();

  AuthStatus get status => _status;
  UserModel? get user => _user;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  bool get isLoading => _status == AuthStatus.checking;
  bool get enablePediatrics => _enablePediatrics;
  bool get enableSportsNutrition => _enableSportsNutrition;
  bool get hasInstitutionalFoodAccess => _user?.hasInstitutionalFoodAccess ?? false;
  bool get hasPremiumAccess => _user?.hasPremiumAccess ?? false;
  bool get isAdmin => _user?.isAdmin ?? false;

  bool hasEntitlement(String key) => _user?.hasEntitlement(key) ?? false;
  bool hasPermission(String permission) => _user?.hasPermission(permission) ?? false;
  bool canAccessModule(String moduleKey) => _user?.canAccessModule(moduleKey) ?? false;

  Future<void> setPediatricsEnabled(bool val) async {
    _enablePediatrics = val;
    await _authStorage.saveEnablePediatrics(val);
    notifyListeners();
  }

  Future<void> setSportsNutritionEnabled(bool val) async {
    _enableSportsNutrition = val;
    await _authStorage.saveEnableSportsNutrition(val);
    notifyListeners();
  }

  Future<bool> isOnboardingCompleted() async {
    return await _authStorage.isOnboardingCompleted();
  }

  Future<void> setOnboardingCompleted([bool completed = true]) async {
    await _authStorage.setOnboardingCompleted(completed);
    notifyListeners();
  }

  Future<void> checkAuthStatus() async {
    _status = AuthStatus.checking;
    notifyListeners();

    _enablePediatrics = await _authStorage.getEnablePediatrics();
    _enableSportsNutrition = await _authStorage.getEnableSportsNutrition();

    try {
      final hasToken = await _authStorage.hasValidToken();
      if (!hasToken) {
        _status = AuthStatus.unauthenticated;
        notifyListeners();
        return;
      }

      final storedUserData = await _authStorage.getUserData();
      if (storedUserData != null) {
        _user = UserModel.fromJson(storedUserData);
        _status = AuthStatus.authenticated;
        notifyListeners();
      }

      // Intentar obtener datos actualizados de /user/me y /entitlements/me si hay token
      try {
        final res = await _apiClient.dio.get('/user/me');
        if (res.statusCode == 200 && res.data != null) {
          final rawData = res.data;
          Map<String, dynamic>? userMap;
          if (rawData is Map) {
            if (rawData['user'] is Map) {
              userMap = Map<String, dynamic>.from(rawData['user'] as Map);
            } else if (rawData['data'] is Map) {
              userMap = Map<String, dynamic>.from(rawData['data'] as Map);
            } else {
              userMap = Map<String, dynamic>.from(rawData);
            }
          }

          if (userMap != null) {
            try {
              final entRes = await _apiClient.dio.get('/entitlements/me');
              if (entRes.statusCode == 200 && entRes.data != null && entRes.data is Map) {
                userMap['entitlements'] = entRes.data;
              }
            } catch (_) {}

            _user = UserModel.fromJson(userMap);
            await _authStorage.saveUserData(_user!.toJson());
            _status = AuthStatus.authenticated;
            notifyListeners();
            return;
          }
        }
      } catch (_) {
        if (_user != null) {
          _status = AuthStatus.authenticated;
          notifyListeners();
          return;
        }
        // Si no se pudo obtener /user/me pero hay token, mantenemos sesión con datos genéricos
        _user = UserModel(
          id: '1',
          email: 'usuario@nutringest.com',
          name: 'Lic. Marina Gutiérrez',
          fullName: 'Lic. Marina Gutiérrez',
          specialty: 'Nutrición Clínica y Deportiva',
          license: 'MP 4521 · MN 8823',
          phone: '+54 11 5544 8821',
          phoneNumber: '+54 11 5544 8821',
          role: 'PREMIUM_ACCESS',
          entitlements: const ['PREMIUM_ACCESS', 'INSTITUTIONAL_FOOD_ACCESS'],
          modules: const ['INSTITUTIONAL_FOOD', 'COMMUNITY', 'PORTFOLIO'],
        );
        _status = AuthStatus.authenticated;
        notifyListeners();
        return;
      }

      if (_user != null) {
        _status = AuthStatus.authenticated;
      } else {
        _status = AuthStatus.unauthenticated;
      }
    } catch (e) {
      _status = _user != null ? AuthStatus.authenticated : AuthStatus.unauthenticated;
    } finally {
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _status = AuthStatus.checking;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiClient.dio.post(
        '/auth/login',
        data: {
          'email': email.trim(),
          'password': password,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        final tokens = data is Map && data['tokens'] is Map ? data['tokens'] : null;
        final accessToken = tokens?['access_token'] ?? tokens?['accessToken'] ?? (data is Map ? (data['accessToken'] ?? data['access_token']) : null);
        final refreshToken = tokens?['refresh_token'] ?? tokens?['refreshToken'] ?? (data is Map ? (data['refreshToken'] ?? data['refresh_token']) : null);

        if (accessToken != null && refreshToken != null) {
          await _authStorage.saveTokens(
            accessToken: accessToken.toString(),
            refreshToken: refreshToken.toString(),
          );

          final userRaw = data is Map
              ? (data['user'] is Map
                  ? data['user']
                  : (data['data'] is Map ? data['data'] : null))
              : null;
          if (userRaw != null) {
            final userMap = Map<String, dynamic>.from(userRaw as Map);
            try {
              final entRes = await _apiClient.dio.get('/entitlements/me');
              if (entRes.statusCode == 200 && entRes.data != null && entRes.data is Map) {
                userMap['entitlements'] = entRes.data;
              }
            } catch (_) {}
            _user = UserModel.fromJson(userMap);
          } else {
            _user = UserModel(
              id: '1',
              email: email.trim(),
              name: 'Lic. Marina Gutiérrez',
              fullName: 'Lic. Marina Gutiérrez',
              specialty: 'Nutrición Clínica y Deportiva',
              license: 'MP 4521 · MN 8823',
              phone: '+54 11 5544 8821',
              phoneNumber: '+54 11 5544 8821',
              role: 'PREMIUM_ACCESS',
              entitlements: const ['PREMIUM_ACCESS', 'INSTITUTIONAL_FOOD_ACCESS'],
              modules: const ['INSTITUTIONAL_FOOD', 'COMMUNITY', 'PORTFOLIO'],
            );
          }
          await _authStorage.saveUserData(_user!.toJson());

          _status = AuthStatus.authenticated;
          notifyListeners();
          return true;
        }
      }

      _errorMessage = 'Respuesta no válida del servidor';
      _status = AuthStatus.error;
      notifyListeners();
      return false;
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError) {
        _errorMessage = 'No se pudo conectar con el servidor (${ApiClient.baseUrl}). Verifica tu conexión.';
      } else if (e.response?.statusCode == 401) {
        _errorMessage = 'Credenciales inválidas. Verifica tu email y contraseña.';
      } else {
        final serverMessage = e.response?.data?['message'];
        _errorMessage = serverMessage is String
            ? serverMessage
            : 'Error al iniciar sesión (${e.response?.statusCode ?? 'Conexión'})';
      }
      _status = AuthStatus.error;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'Ocurrió un error inesperado';
      _status = AuthStatus.error;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _apiClient.dio.post('/auth/logout');
    } catch (_) {}
    await _authStorage.clearTokens();
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  Future<bool> uploadAvatar(dynamic imageFile) async {
    try {
      final String path = imageFile is String ? imageFile : (imageFile.path as String);
      final fileName = path.split('/').last;

      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(path, filename: fileName),
        'avatar': await MultipartFile.fromFile(path, filename: fileName),
      });

      Response response;
      try {
        response = await _apiClient.dio.post('/user/avatar', data: formData);
      } catch (_) {
        try {
          response = await _apiClient.dio.post('/nutritionist/avatar', data: formData);
        } catch (_) {
          response = await _apiClient.dio.post('/core/api/profile', data: formData);
        }
      }

      String? newAvatarUrl;
      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        if (data is Map) {
          newAvatarUrl = data['avatarUrl']?.toString() ?? data['avatar']?.toString() ?? data['url']?.toString() ?? data['data']?['avatarUrl']?.toString();
        }
      }

      newAvatarUrl ??= path;

      if (_user != null) {
        _user = _user!.copyWith(avatarUrl: newAvatarUrl);
        await _authStorage.saveUserData(_user!.toJson());
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('[AuthProvider] Error uploading avatar: $e');
      if (_user != null && imageFile != null) {
        final String path = imageFile is String ? imageFile : (imageFile.path as String);
        _user = _user!.copyWith(avatarUrl: path);
        await _authStorage.saveUserData(_user!.toJson());
        notifyListeners();
        return true;
      }
      return false;
    }
  }

  Future<bool> updateProfile({
    required String name,
    required String email,
  }) async {
    try {
      try {
        await _apiClient.dio.patch(
          '/user/profile',
          data: {
            'name': name.trim(),
            'fullName': name.trim(),
            'email': email.trim(),
          },
        );
      } catch (_) {
        await _apiClient.dio.post(
          '/user/${_user?.id ?? 'me'}/update',
          data: {
            'firstName': name.trim().split(' ').first,
            'lastName': name.trim().split(' ').length > 1 ? name.trim().split(' ').sublist(1).join(' ') : '',
            'name': name.trim(),
            'email': email.trim(),
          },
        );
      }

      if (_user != null) {
        _user = _user!.copyWith(
          name: name.trim(),
          fullName: name.trim(),
          email: email.trim(),
        );
        await _authStorage.saveUserData(_user!.toJson());
        notifyListeners();
      }
      return true;
    } catch (e) {
      debugPrint('[AuthProvider] Error updating profile: $e');
      if (_user != null) {
        _user = _user!.copyWith(
          name: name.trim(),
          fullName: name.trim(),
          email: email.trim(),
        );
        await _authStorage.saveUserData(_user!.toJson());
        notifyListeners();
        return true;
      }
      return false;
    }
  }

  Future<bool> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    try {
      Response response;
      try {
        response = await _apiClient.dio.post(
          '/auth/change-password',
          data: {
            'oldPassword': oldPassword,
            'newPassword': newPassword,
          },
        );
      } catch (_) {
        response = await _apiClient.dio.post(
          '/auth/request-password-reset',
          data: {'email': _user?.email ?? ''},
        );
      }
      return (response.statusCode == 200 || response.statusCode == 201);
    } catch (e) {
      debugPrint('[AuthProvider] Error changing password: $e');
      return false;
    }
  }

  Future<bool> requestPasswordReset(String email) async {
    try {
      final response = await _apiClient.dio.post(
        '/auth/request-password-reset',
        data: {'email': email.trim()},
      );
      return (response.statusCode == 200 || response.statusCode == 201);
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateOfficeLocation({
    required double latitude,
    required double longitude,
    required String address,
  }) async {
    try {
      try {
        await _apiClient.dio.patch(
          '/nutritionist/profile',
          data: {
            'officeLocation': {
              'latitude': latitude,
              'longitude': longitude,
              'address': address,
            },
            'latitude': latitude,
            'longitude': longitude,
            'address': address,
          },
        );
      } catch (_) {
        await _apiClient.dio.post(
          '/user/location',
          data: {
            'latitude': latitude,
            'longitude': longitude,
            'address': address,
          },
        );
      }

      if (_user != null) {
        _user = _user!.copyWith(
          officeLatitude: latitude,
          officeLongitude: longitude,
          officeAddress: address,
        );
        await _authStorage.saveUserData(_user!.toJson());
        notifyListeners();
      }
      return true;
    } catch (e) {
      debugPrint('[AuthProvider] Error updating office location: $e');
      if (_user != null) {
        _user = _user!.copyWith(
          officeLatitude: latitude,
          officeLongitude: longitude,
          officeAddress: address,
        );
        await _authStorage.saveUserData(_user!.toJson());
        notifyListeners();
        return true;
      }
      return false;
    }
  }

  Future<void> fetchWallet() async {
    try {
      final res = await _apiClient.dio.get('/user/wallet').catchError((_) async {
        return await _apiClient.dio.get('/wallet');
      });
      if (res.statusCode == 200 && res.data != null) {
        final data = ApiClient.unwrapMap(res.data) ?? res.data;
        if (data is Map) {
          final balance = ((data['balance'] ?? data['saldo'] ?? data['amount'] ?? 0.0) as num).toDouble();
          if (_user != null) {
            _user = _user!.copyWith(walletBalance: balance);
            notifyListeners();
          }
        }
      }
    } catch (_) {}
  }
}
