class WasteFoodModel {
  final String id;
  final String name;
  final String category;
  final double averageWastePercentage;
  final String iconName;

  const WasteFoodModel({
    required this.id,
    required this.name,
    required this.category,
    required this.averageWastePercentage,
    required this.iconName,
  });

  static List<WasteFoodModel> get defaultCatalog => const [
        WasteFoodModel(
          id: '1',
          name: 'Manzana',
          category: 'Frutas',
          averageWastePercentage: 12.0,
          iconName: 'apple',
        ),
        WasteFoodModel(
          id: '2',
          name: 'Papa (Patata)',
          category: 'Tubérculos',
          averageWastePercentage: 15.0,
          iconName: 'potato',
        ),
        WasteFoodModel(
          id: '3',
          name: 'Pollo Entero',
          category: 'Carnes',
          averageWastePercentage: 35.0,
          iconName: 'poultry',
        ),
        WasteFoodModel(
          id: '4',
          name: 'Pescado Entero',
          category: 'Pescados',
          averageWastePercentage: 45.0,
          iconName: 'fish',
        ),
        WasteFoodModel(
          id: '5',
          name: 'Espinaca',
          category: 'Verduras',
          averageWastePercentage: 20.0,
          iconName: 'spinach',
        ),
        WasteFoodModel(
          id: '6',
          name: 'Zanahoria',
          category: 'Verduras',
          averageWastePercentage: 15.0,
          iconName: 'carrot',
        ),
        WasteFoodModel(
          id: '7',
          name: 'Plátano / Banano',
          category: 'Frutas',
          averageWastePercentage: 35.0,
          iconName: 'banana',
        ),
        WasteFoodModel(
          id: '8',
          name: 'Brócoli',
          category: 'Verduras',
          averageWastePercentage: 25.0,
          iconName: 'broccoli',
        ),
        WasteFoodModel(
          id: '9',
          name: 'Naranja',
          category: 'Frutas',
          averageWastePercentage: 30.0,
          iconName: 'orange',
        ),
        WasteFoodModel(
          id: '10',
          name: 'Tomate',
          category: 'Verduras',
          averageWastePercentage: 10.0,
          iconName: 'tomato',
        ),
        WasteFoodModel(
          id: '11',
          name: 'Piña',
          category: 'Frutas',
          averageWastePercentage: 40.0,
          iconName: 'pineapple',
        ),
        WasteFoodModel(
          id: '12',
          name: 'Carne de Res con Hueso',
          category: 'Carnes',
          averageWastePercentage: 25.0,
          iconName: 'meat',
        ),
      ];
}
