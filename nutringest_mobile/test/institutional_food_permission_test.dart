import 'package:flutter_test/flutter_test.dart';
import 'package:nutringest_mobile/features/auth/models/user_model.dart';

void main() {
  group('UserModel - Alimentación Colectiva & Entitlement Evaluations', () {
    test('isInstitutionalFoodKey matches all expected casing and alias variants', () {
      expect(UserModel.isInstitutionalFoodKey('INSTITUTIONAL_FOOD'), isTrue);
      expect(UserModel.isInstitutionalFoodKey('institutional_food'), isTrue);
      expect(UserModel.isInstitutionalFoodKey('INSTITUTIONAL_FOOD_ACCESS'), isTrue);
      expect(UserModel.isInstitutionalFoodKey('institutional_food_access'), isTrue);
      expect(UserModel.isInstitutionalFoodKey('INSTITUTIONAL_NUTRITION'), isTrue);
      expect(UserModel.isInstitutionalFoodKey('institutional_nutrition'), isTrue);
      expect(UserModel.isInstitutionalFoodKey('INSTITUTIONAL'), isTrue);
      expect(UserModel.isInstitutionalFoodKey('institutional'), isTrue);
      expect(UserModel.isInstitutionalFoodKey('  INSTITUTIONAL_FOOD  '), isTrue);
      expect(UserModel.isInstitutionalFoodKey('OTHER_KEY'), isFalse);
      expect(UserModel.isInstitutionalFoodKey(null), isFalse);
    });

    test('User with role ADMIN or SUPERADMIN has full institutional access', () {
      final adminUser = UserModel.fromJson({
        'id': 'admin-1',
        'email': 'admin@nutringest.com',
        'role': 'ADMIN',
      });
      expect(adminUser.isAdmin, isTrue);
      expect(adminUser.hasInstitutionalFoodAccess, isTrue);
      expect(adminUser.hasEntitlement('INSTITUTIONAL_FOOD'), isTrue);
      expect(adminUser.hasPermission('INSTITUTIONAL_FOOD'), isTrue);

      final superadminUser = UserModel.fromJson({
        'id': 'superadmin-1',
        'email': 'super@nutringest.com',
        'permits': {'name': 'SUPERADMIN', 'list': []},
      });
      expect(superadminUser.isAdmin, isTrue);
      expect(superadminUser.hasInstitutionalFoodAccess, isTrue);
    });

    test('User with role PREMIUM or PREMIUM_ACCESS has institutional food access', () {
      final premiumUser = UserModel.fromJson({
        'id': 'prem-1',
        'email': 'prem@nutringest.com',
        'role': 'PREMIUM',
      });
      expect(premiumUser.hasPremiumAccess, isTrue);
      expect(premiumUser.hasInstitutionalFoodAccess, isTrue);
      expect(premiumUser.hasEntitlement('INSTITUTIONAL_FOOD'), isTrue);
    });

    test('User with NestJS permits relation (list containing INSTITUTIONAL_FOOD_ACCESS) has access', () {
      final user = UserModel.fromJson({
        'id': 'nutri-1',
        'email': 'nutri@nutringest.com',
        'permits': {
          'id': 'permit-user',
          'name': 'USER',
          'list': ['MENU_LIST_OWN', 'FOOD_LIST_OWN', 'INSTITUTIONAL_FOOD_ACCESS'],
        },
      });
      expect(user.isAdmin, isFalse);
      expect(user.hasInstitutionalFoodAccess, isTrue);
      expect(user.hasEntitlement('INSTITUTIONAL_FOOD'), isTrue);
      expect(user.hasPermission('INSTITUTIONAL_FOOD_ACCESS'), isTrue);
    });

    test('User with NestJS userPermissions containing INSTITUTIONAL_FOOD has access (case insensitive)', () {
      final user = UserModel.fromJson({
        'id': 'nutri-2',
        'email': 'nutri2@nutringest.com',
        'userPermissions': [
          {'permission': 'institutional_food', 'expiresAt': null},
        ],
      });
      expect(user.hasInstitutionalFoodAccess, isTrue);
      expect(user.hasEntitlement('INSTITUTIONAL_FOOD'), isTrue);
    });

    test('User with resolved entitlements object from NestJS /api/entitlements/me has access', () {
      final user = UserModel.fromJson({
        'id': 'nutri-3',
        'email': 'nutri3@nutringest.com',
        'entitlements': {
          'permissions': ['COMMUNITY_ACCESS', 'INSTITUTIONAL_FOOD_ACCESS'],
          'modules': [
            {'key': 'COMMUNITY', 'source': 'PLAN'},
            {'key': 'INSTITUTIONAL_FOOD', 'source': 'PLAN'},
          ],
        },
      });
      expect(user.hasInstitutionalFoodAccess, isTrue);
      expect(user.hasEntitlement('INSTITUTIONAL_FOOD'), isTrue);
      expect(user.canAccessModule('INSTITUTIONAL_FOOD'), isTrue);
    });

    test('User with active subscription granting INSTITUTIONAL_FOOD modules/grants has access', () {
      final user = UserModel.fromJson({
        'id': 'nutri-4',
        'email': 'nutri4@nutringest.com',
        'subscriptions': [
          {
            'status': 'ACTIVE',
            'plan': {
              'id': 'plan-prem',
              'name': 'Plan Premium Anual',
              'content': {
                'grants': ['PREMIUM_ACCESS', 'INSTITUTIONAL_FOOD_ACCESS'],
                'modules': ['INSTITUTIONAL_FOOD', 'PORTFOLIO'],
              },
            },
          },
        ],
      });
      expect(user.hasPremiumAccess, isTrue);
      expect(user.hasInstitutionalFoodAccess, isTrue);
      expect(user.hasEntitlement('INSTITUTIONAL_FOOD'), isTrue);
    });

    test('User with INSTITUTIONAL_NUTRITION entitlement has institutional food access', () {
      final user = UserModel.fromJson({
        'id': 'nutri-5',
        'email': 'nutri5@nutringest.com',
        'entitlements': ['INSTITUTIONAL_NUTRITION'],
      });
      expect(user.hasInstitutionalFoodAccess, isTrue);
      expect(user.hasEntitlement('INSTITUTIONAL_FOOD'), isTrue);
    });

    test('Standard user without any premium or institutional entitlement is denied', () {
      final freeUser = UserModel.fromJson({
        'id': 'free-1',
        'email': 'free@nutringest.com',
        'role': 'USER',
        'permits': {
          'name': 'USER',
          'list': ['MENU_LIST_OWN', 'FOOD_LIST_OWN'],
        },
        'entitlements': [],
        'userPermissions': [],
        'subscriptions': [],
      });
      expect(freeUser.isAdmin, isFalse);
      expect(freeUser.hasPremiumAccess, isFalse);
      expect(freeUser.hasInstitutionalFoodAccess, isFalse);
      expect(freeUser.hasEntitlement('INSTITUTIONAL_FOOD'), isFalse);
    });

    test('toJson and fromJson preserves all entitlements and permissions for storage', () {
      final original = UserModel.fromJson({
        'id': 'nutri-save',
        'email': 'save@nutringest.com',
        'role': 'USER',
        'entitlements': ['INSTITUTIONAL_FOOD_ACCESS'],
        'userPermissions': [{'permission': 'INSTITUTIONAL_FOOD'}],
        'modules': ['INSTITUTIONAL_FOOD'],
      });
      final json = original.toJson();
      final restored = UserModel.fromJson(json);

      expect(restored.hasInstitutionalFoodAccess, isTrue);
      expect(restored.hasEntitlement('INSTITUTIONAL_FOOD'), isTrue);
      expect(restored.entitlements, contains('INSTITUTIONAL_FOOD_ACCESS'));
      expect(restored.modules, contains('INSTITUTIONAL_FOOD'));
    });
  });
}
