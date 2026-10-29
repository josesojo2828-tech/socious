const fs = require('fs');
const path = require('path');

const pathologyMenus = [
  // 1. arepitas de cosas.jpg (4 Tortitas/Arepitas Saludables)
  {
    imageFile: 'arepitas de cosas.jpg',
    name: 'Tortitas de Lentejas y Zanahoria',
    category: 'almuerzo',
    description: 'Tortitas nutritivas y rendidoras de lentejas cocidas, zanahoria rallada, huevo y avena.',
    tags: ['anti-inflamatorio', 'tortitas', 'lentejas', 'vegetariano', 'fibra'],
    foods: [
      { name: 'Lentejas cocidas', quantity: 120, unit: 'g' },
      { name: 'Zanahoria', quantity: 50, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' },
      { name: 'Avena', quantity: 30, unit: 'g' }
    ]
  },
  {
    imageFile: 'arepitas de cosas.jpg',
    name: 'Tortitas de Coliflor y Avena',
    category: 'cena',
    description: 'Tortitas livianas y económicas de coliflor cocida con avena y huevo.',
    tags: ['anti-inflamatorio', 'bajo-ig', 'coliflor', 'tortitas', 'cena-ligera'],
    foods: [
      { name: 'Coliflor', quantity: 150, unit: 'g' },
      { name: 'Avena', quantity: 30, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' },
      { name: 'Queso fresco', quantity: 30, unit: 'g' }
    ]
  },
  {
    imageFile: 'arepitas de cosas.jpg',
    name: 'Tortitas de Brócoli y Queso',
    category: 'cena',
    description: 'Tortitas crocantes por fuera y cremosas por dentro de brócoli cocido, queso y huevo.',
    tags: ['anti-inflamatorio', 'brocoli', 'queso', 'keto-friendly'],
    foods: [
      { name: 'Brócoli', quantity: 140, unit: 'g' },
      { name: 'Queso Mozzarella', quantity: 40, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' },
      { name: 'Avena', quantity: 20, unit: 'g' }
    ]
  },
  {
    imageFile: 'arepitas de cosas.jpg',
    name: 'Tortitas de Arroz y Zucchini',
    category: 'almuerzo',
    description: 'Tortitas suaves de arroz integral cocido con calabacín/zucchini y zanahoria.',
    tags: ['bajo-ig', 'arroz-integral', 'zucchini', 'facil-digestion'],
    foods: [
      { name: 'Arroz integral', quantity: 100, unit: 'g' },
      { name: 'Zucchini / Calabacín', quantity: 60, unit: 'g' },
      { name: 'Zanahoria', quantity: 40, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' }
    ]
  },

  // 2. batidos diabetes.jpg (3 Licuados para Diabetes)
  {
    imageFile: 'batidos diabetes.jpg',
    name: 'Licuado Verde para Control de Glucosa',
    category: 'desayuno',
    description: 'Licuado detox rico en fibra con pepino, col rizada, ejotes y limón.',
    tags: ['diabetes', 'bajo-ig', 'licuado-verde', 'fibra', 'desintoxicante'],
    foods: [
      { name: 'Pepino', quantity: 100, unit: 'g' },
      { name: 'Espinaca', quantity: 50, unit: 'g' },
      { name: 'Ejotes / Judías verdes', quantity: 40, unit: 'g' },
      { name: 'Limón', quantity: 20, unit: 'g' }
    ]
  },
  {
    imageFile: 'batidos diabetes.jpg',
    name: 'Licuado de Jamaica, Canela y Linaza',
    category: 'snack',
    description: 'Infusión de flor de jamaica con canela molida, apio y linaza molida para regular la glucosa.',
    tags: ['diabetes', 'jamaica', 'canela', 'linaza', 'salud-cardiovascular'],
    foods: [
      { name: 'Apio', quantity: 50, unit: 'g' },
      { name: 'Semillas de linaza', quantity: 15, unit: 'g' },
      { name: 'Canela', quantity: 3, unit: 'g' }
    ]
  },
  {
    imageFile: 'batidos diabetes.jpg',
    name: 'Licuado Rojo para Sensibilidad a la Insulina',
    category: 'snack',
    description: 'Licuado nutritivo de ejotes con limón y antioxidantes para control metabólico.',
    tags: ['diabetes', 'bajo-ig', 'sensibilidad-insulina', 'metabolico'],
    foods: [
      { name: 'Ejotes / Judías verdes', quantity: 80, unit: 'g' },
      { name: 'Limón', quantity: 20, unit: 'g' },
      { name: 'Pepino', quantity: 80, unit: 'g' }
    ]
  },

  // 3. batidos.jpg (5 Batidos Saludables)
  {
    imageFile: 'batidos.jpg',
    name: 'Batido Desintoxicante de Pepino y Manzana Verde',
    category: 'desayuno',
    description: 'Batido verde desintoxicante y digestivo con pepino, manzana verde, espinaca y limón.',
    tags: ['detox', 'digestivo', 'manzana-verde', 'espinaca'],
    foods: [
      { name: 'Pepino', quantity: 80, unit: 'g' },
      { name: 'Manzana verde', quantity: 80, unit: 'g' },
      { name: 'Espinaca', quantity: 40, unit: 'g' },
      { name: 'Limón', quantity: 15, unit: 'g' }
    ]
  },
  {
    imageFile: 'batidos.jpg',
    name: 'Batido Inmunológico de Yogur y Chía',
    category: 'desayuno',
    description: 'Batido cremoso para reforzar defensas con yogur natural y semillas de chía.',
    tags: ['inmunologico', 'yogur', 'chia', 'probioticos'],
    foods: [
      { name: 'Yogur natural', quantity: 200, unit: 'g' },
      { name: 'Semillas de chía', quantity: 15, unit: 'g' }
    ]
  },
  {
    imageFile: 'batidos.jpg',
    name: 'Batido Energético de Plátano y Avena',
    category: 'desayuno',
    description: 'Batido nutritivo de plátano con avena entera para energía natural sostenida.',
    tags: ['energia', 'platano', 'avena', 'pre-entreno'],
    foods: [
      { name: 'Plátano', quantity: 100, unit: 'g' },
      { name: 'Avena', quantity: 40, unit: 'g' },
      { name: 'Leche entera', quantity: 200, unit: 'ml' }
    ]
  },
  {
    imageFile: 'batidos.jpg',
    name: 'Batido Neuro-Saludable de Arándanos y Nueces',
    category: 'snack',
    description: 'Batido rico en antioxidantes con arándanos, nueces, linaza y yogur natural.',
    tags: ['antioxidante', 'arandanos', 'nueces', 'linaza', 'salud-cerebral'],
    foods: [
      { name: 'Arándanos', quantity: 60, unit: 'g' },
      { name: 'Nueces', quantity: 20, unit: 'g' },
      { name: 'Semillas de linaza', quantity: 10, unit: 'g' },
      { name: 'Yogur natural', quantity: 150, unit: 'g' }
    ]
  },
  {
    imageFile: 'batidos.jpg',
    name: 'Batido Visual de Zanahoria, Papaya y Naranja',
    category: 'snack',
    description: 'Batido rico en betacarotenos de zanahoria, papaya fresca, naranja y semillas de calabaza.',
    tags: ['betacaroteno', 'zanahoria', 'papaya', 'naranja', 'salud-visual'],
    foods: [
      { name: 'Zanahoria', quantity: 60, unit: 'g' },
      { name: 'Papaya', quantity: 80, unit: 'g' },
      { name: 'Naranja', quantity: 80, unit: 'g' },
      { name: 'Semillas de calabaza', quantity: 10, unit: 'g' }
    ]
  },

  // 4. carne vegetales salteados.jpg (1 Salteado)
  {
    imageFile: 'carne vegetales salteados.jpg',
    name: 'Salteado de Carne Magra con Vegetales Mixtos',
    category: 'almuerzo',
    description: 'Carne de res magra salteada al wok con brócoli, pimiento rojo, zanahoria, calabacín y salsa de soya baja en sodio.',
    tags: ['almuerzo', 'carne', 'brocoli', 'salteado', 'proteico'],
    foods: [
      { name: 'Carne de res magra', quantity: 160, unit: 'g' },
      { name: 'Brócoli', quantity: 80, unit: 'g' },
      { name: 'Pimiento rojo', quantity: 50, unit: 'g' },
      { name: 'Zanahoria', quantity: 40, unit: 'g' },
      { name: 'Zucchini / Calabacín', quantity: 50, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 8, unit: 'g' }
    ]
  },

  // 5. comindas anti-inflamatorias.jpg (15 Platos Anti-Inflamatorios)
  {
    imageFile: 'comindas anti-inflamatorias.jpg',
    name: 'Salmón a la Parrilla con Verduras Asadas',
    category: 'almuerzo',
    description: 'Filete de salmón rico en Omega-3 acompañado de vegetalitos asados al romero.',
    tags: ['anti-inflamatorio', 'salmon', 'omega-3', 'verduras-asadas'],
    foods: [
      { name: 'Salmón', quantity: 160, unit: 'g' },
      { name: 'Zucchini / Calabacín', quantity: 80, unit: 'g' },
      { name: 'Pimiento rojo', quantity: 60, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'comindas anti-inflamatorias.jpg',
    name: 'Pollo al Cúrcuma con Arroz Integral',
    category: 'almuerzo',
    description: 'Pechuga de pollo sazonada con cúrcuma antiinflamatoria y arroz integral.',
    tags: ['anti-inflamatorio', 'curcuma', 'pollo', 'arroz-integral'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Arroz integral', quantity: 120, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 5, unit: 'g' }
    ]
  },
  {
    imageFile: 'comindas anti-inflamatorias.jpg',
    name: 'Bowl de Quinoa y Vegetales Antiinflamatorios',
    category: 'almuerzo',
    description: 'Bowl nutritivo de quinoa cocida con espinacas, aguacate y tomates cherry.',
    tags: ['anti-inflamatorio', 'quinoa', 'vegetariano', 'aguacate'],
    foods: [
      { name: 'Quinoa cocida', quantity: 140, unit: 'g' },
      { name: 'Espinaca', quantity: 50, unit: 'g' },
      { name: 'Aguacate', quantity: 50, unit: 'g' },
      { name: 'Tomate cherry', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'comindas anti-inflamatorias.jpg',
    name: 'Pollo al Limón con Ajo y Espárragos',
    category: 'cena',
    description: 'Pechuga de pollo marinada al limón y ajo servida con espárragos tiernos.',
    tags: ['anti-inflamatorio', 'pollo', 'limon', 'esparragos', 'cena-ligera'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Espárragos', quantity: 100, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 8, unit: 'g' }
    ]
  },
  {
    imageFile: 'comindas anti-inflamatorias.jpg',
    name: 'Estofado de Lentejas y Verduras',
    category: 'almuerzo',
    description: 'Guiso suave de lentejas con zanahoria, cebolla y espinaca.',
    tags: ['anti-inflamatorio', 'lentejas', 'guiso', 'fibra', 'legumbres'],
    foods: [
      { name: 'Lentejas cocidas', quantity: 180, unit: 'g' },
      { name: 'Zanahoria', quantity: 50, unit: 'g' },
      { name: 'Espinaca', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'comindas anti-inflamatorias.jpg',
    name: 'Camote Relleno de Garbanzos y Espinacas',
    category: 'almuerzo',
    description: 'Camote/Batata horneada rellena con garbanzos salteados y espinaca.',
    tags: ['anti-inflamatorio', 'camote', 'garbanzos', 'bajo-ig'],
    foods: [
      { name: 'Camote / Batata', quantity: 150, unit: 'g' },
      { name: 'Garbanzos', quantity: 80, unit: 'g' },
      { name: 'Espinaca', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'comindas anti-inflamatorias.jpg',
    name: 'Coliflor y Garbanzos Asados al Horno',
    category: 'cena',
    description: 'Floretes de coliflor y garbanzos crocantes horneados con especias.',
    tags: ['anti-inflamatorio', 'coliflor', 'garbanzos', 'asados'],
    foods: [
      { name: 'Coliflor', quantity: 150, unit: 'g' },
      { name: 'Garbanzos', quantity: 100, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'comindas anti-inflamatorias.jpg',
    name: 'Espaguetis de Calabacín con Pesto de Albahaca',
    category: 'cena',
    description: 'Zoodles de calabacín fresco salteados con pesto casero de albahaca y piñones.',
    tags: ['anti-inflamatorio', 'zoodles', 'zucchini', 'keto', 'pesto'],
    foods: [
      { name: 'Zucchini / Calabacín', quantity: 200, unit: 'g' },
      { name: 'Pesto', quantity: 25, unit: 'g' },
      { name: 'Tomate cherry', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'comindas anti-inflamatorias.jpg',
    name: 'Sopa de Verduras y Cúrcuma Sanadora',
    category: 'cena',
    description: 'Caldo de vegetales mixtos sazonado con jengibre y cúrcuma.',
    tags: ['anti-inflamatorio', 'sopa', 'curcuma', 'jengibre', 'digestivo'],
    foods: [
      { name: 'Sopa de verduras', quantity: 250, unit: 'g' }
    ]
  },
  {
    imageFile: 'comindas anti-inflamatorias.jpg',
    name: 'Bowl de Miso, Tofu y Vegetales',
    category: 'almuerzo',
    description: 'Bowl reconfortante de caldo miso con cubos de tofu y brotes verdes.',
    tags: ['anti-inflamatorio', 'miso', 'tofu', 'probioticos', 'vegano'],
    foods: [
      { name: 'Tofu', quantity: 120, unit: 'g' },
      { name: 'Espinaca', quantity: 50, unit: 'g' },
      { name: 'Zucchini / Calabacín', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'comindas anti-inflamatorias.jpg',
    name: 'Bacalao al Horno con Espárragos',
    category: 'cena',
    description: 'Filete de bacalao tierno al horno con espárragos verdes.',
    tags: ['anti-inflamatorio', 'bacalao', 'pescado-blanco', 'esparragos'],
    foods: [
      { name: 'Pescado blanco', quantity: 160, unit: 'g' },
      { name: 'Espárragos', quantity: 100, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 8, unit: 'g' }
    ]
  },
  {
    imageFile: 'comindas anti-inflamatorias.jpg',
    name: 'Camarones al Ajo y Jengibre',
    category: 'cena',
    description: 'Camarones salteados al wok con ajo picado, jengibre y aceite de sésamo.',
    tags: ['anti-inflamatorio', 'camarones', 'jengibre', 'ajo', 'proteico'],
    foods: [
      { name: 'Camarones', quantity: 150, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 8, unit: 'g' },
      { name: 'Espinaca', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'comindas anti-inflamatorias.jpg',
    name: 'Pollo a la Parrilla con Quinoa y Aguacate',
    category: 'almuerzo',
    description: 'Pechuga de pollo a la parrilla servida con quinoa y palta.',
    tags: ['anti-inflamatorio', 'pollo', 'quinoa', 'aguacate'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Quinoa cocida', quantity: 100, unit: 'g' },
      { name: 'Aguacate', quantity: 40, unit: 'g' }
    ]
  },

  // 6. crepas.jpg (4 Crepas Saludables)
  {
    imageFile: 'crepas.jpg',
    name: 'Crepas de Remolacha y Avena',
    category: 'desayuno',
    description: 'Crepas de color magenta hechas con remolacha, huevo, avena molida y leche.',
    tags: ['crepas', 'remolacha', 'avena', 'desayuno-saludable'],
    foods: [
      { name: 'Avena', quantity: 40, unit: 'g' },
      { name: 'Remolacha / Betarraga', quantity: 40, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' },
      { name: 'Leche entera', quantity: 100, unit: 'ml' }
    ]
  },
  {
    imageFile: 'crepas.jpg',
    name: 'Crepas de Avena y Almendras',
    category: 'desayuno',
    description: 'Crepas finas de avena con harina de almendras y manteca suave.',
    tags: ['crepas', 'almendras', 'avena', 'desayuno'],
    foods: [
      { name: 'Avena', quantity: 40, unit: 'g' },
      { name: 'Almendras', quantity: 20, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' },
      { name: 'Leche entera', quantity: 100, unit: 'ml' }
    ]
  },
  {
    imageFile: 'crepas.jpg',
    name: 'Crepas de Manzana, Avena y Canela',
    category: 'desayuno',
    description: 'Crepas de avena con puré de manzana dulce y un toque de canela.',
    tags: ['crepas', 'manzana', 'canela', 'avena'],
    foods: [
      { name: 'Avena', quantity: 40, unit: 'g' },
      { name: 'Manzana', quantity: 60, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' },
      { name: 'Canela', quantity: 2, unit: 'g' }
    ]
  },
  {
    imageFile: 'crepas.jpg',
    name: 'Crepas de Coco y Avena',
    category: 'desayuno',
    description: 'Crepas tropicales de harina de coco con avena y leche vegetal o entera.',
    tags: ['crepas', 'coco', 'avena', 'desayuno'],
    foods: [
      { name: 'Avena', quantity: 40, unit: 'g' },
      { name: 'Coco rallado', quantity: 15, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' },
      { name: 'Leche entera', quantity: 100, unit: 'ml' }
    ]
  },

  // 7. desayuno diabeticos.jpg (5 Desayunos para Diabéticos)
  {
    imageFile: 'desayuno diabeticos.jpg',
    name: 'Desayuno Diabético: Avena con Frutos Rojos y Nueces',
    category: 'desayuno',
    description: 'Avena cocida baja en IG con frutos rojos frescos y nueces picadas (180 kcal, glucosa estable).',
    tags: ['diabetes', 'desayuno', 'bajo-ig', 'avena', 'frutos-rojos'],
    foods: [
      { name: 'Avena', quantity: 35, unit: 'g' },
      { name: 'Frutos rojos', quantity: 50, unit: 'g' },
      { name: 'Nueces', quantity: 15, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno diabeticos.jpg',
    name: 'Desayuno Diabético: Omelette de Espinacas y Champiñones',
    category: 'desayuno',
    description: 'Omelette proteico de 2 huevos con espinacas y champiñones salteados (200 kcal, 5g carbs).',
    tags: ['diabetes', 'desayuno', 'omelette', 'keto-friendly', 'proteico'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Espinaca', quantity: 50, unit: 'g' },
      { name: 'Champiñones', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno diabeticos.jpg',
    name: 'Desayuno Diabético: Yogur Griego con Semillas y Manzana',
    category: 'desayuno',
    description: 'Yogur sin azúcar con media manzana picada y semillas de chía (180 kcal).',
    tags: ['diabetes', 'desayuno', 'yogur-griego', 'chia', 'manzana'],
    foods: [
      { name: 'Yogur griego', quantity: 150, unit: 'g' },
      { name: 'Manzana', quantity: 60, unit: 'g' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno diabeticos.jpg',
    name: 'Desayuno Diabético: Tostada Integral con Aguacate y Huevo',
    category: 'desayuno',
    description: 'Tostada de pan de grano entero con medio aguacate y 1 huevo duro (230 kcal).',
    tags: ['diabetes', 'desayuno', 'tostada-integral', 'aguacate', 'huevo'],
    foods: [
      { name: 'Pan integral', quantity: 30, unit: 'g' },
      { name: 'Aguacate', quantity: 40, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno diabeticos.jpg',
    name: 'Desayuno Diabético: Smoothie Verde Alcalino',
    category: 'desayuno',
    description: 'Licuado ligero de espinacas, pepino y manzana verde (150 kcal).',
    tags: ['diabetes', 'desayuno', 'smoothie-verde', 'alcalino'],
    foods: [
      { name: 'Espinaca', quantity: 40, unit: 'g' },
      { name: 'Pepino', quantity: 60, unit: 'g' },
      { name: 'Manzana verde', quantity: 60, unit: 'g' }
    ]
  },

  // 8. diabeticos snack.jpg (5 Snacks para Diabéticos)
  {
    imageFile: 'diabeticos snack.jpg',
    name: 'Snack Diabético: Manzana con Nueces y Canela',
    category: 'snack',
    description: 'Rodajas de manzana crujiente espolvoreadas con canela y acompañadas de nueces saciantes.',
    tags: ['diabetes', 'snack', 'manzana', 'nueces', 'canela'],
    foods: [
      { name: 'Manzana', quantity: 100, unit: 'g' },
      { name: 'Nueces', quantity: 20, unit: 'g' },
      { name: 'Canela', quantity: 2, unit: 'g' }
    ]
  },
  {
    imageFile: 'diabeticos snack.jpg',
    name: 'Snack Diabético: Yogur Griego con Frutos Rojos y Chía',
    category: 'snack',
    description: 'Yogur cremoso sin azúcar con arándanos o fresas y chía.',
    tags: ['diabetes', 'snack', 'yogur-griego', 'frutos-rojos'],
    foods: [
      { name: 'Yogur griego', quantity: 120, unit: 'g' },
      { name: 'Frutos rojos', quantity: 40, unit: 'g' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'diabeticos snack.jpg',
    name: 'Snack Diabético: Huevo Duro con Aguacate',
    category: 'snack',
    description: 'Huevo hervido sazonado con sal marina y rebanadas de palta fresca.',
    tags: ['diabetes', 'snack', 'huevo', 'aguacate', 'keto'],
    foods: [
      { name: 'Huevo entero', quantity: 50, unit: 'g' },
      { name: 'Aguacate', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'diabeticos snack.jpg',
    name: 'Snack Diabético: Queso Fresco con Tomate y Albahaca',
    category: 'snack',
    description: 'Queso fresco bajo en grasa servido con rodajas de tomate y albahaca.',
    tags: ['diabetes', 'snack', 'queso-fresco', 'tomate'],
    foods: [
      { name: 'Queso fresco', quantity: 60, unit: 'g' },
      { name: 'Tomate', quantity: 60, unit: 'g' }
    ]
  },
  {
    imageFile: 'diabeticos snack.jpg',
    name: 'Snack Diabético: Gelatina Sin Azúcar con Frutos Rojos',
    category: 'snack',
    description: 'Gelatina ligera 0% azúcar acompañada de frutos rojos frescos.',
    tags: ['diabetes', 'snack', 'gelatina', 'cero-azucar'],
    foods: [
      { name: 'Frutos rojos', quantity: 50, unit: 'g' }
    ]
  },

  // 9. hetcakes diabeticos.jpg (4 Hotcakes para Diabéticos)
  {
    imageFile: 'hetcakes diabeticos.jpg',
    name: 'Hotcakes Diabéticos de Avena y Plátano',
    category: 'desayuno',
    description: 'Hotcakes esponjosos de harina de avena, plátano maduro, huevo y canela.',
    tags: ['diabetes', 'hotcakes', 'avena', 'platano'],
    foods: [
      { name: 'Avena', quantity: 40, unit: 'g' },
      { name: 'Plátano', quantity: 60, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' },
      { name: 'Canela', quantity: 2, unit: 'g' }
    ]
  },
  {
    imageFile: 'hetcakes diabeticos.jpg',
    name: 'Hotcakes Diabéticos de Yogur y Avena',
    category: 'desayuno',
    description: 'Hotcakes proteicos con yogur griego natural y avena integral.',
    tags: ['diabetes', 'hotcakes', 'yogur-griego', 'avena'],
    foods: [
      { name: 'Avena', quantity: 40, unit: 'g' },
      { name: 'Yogur griego', quantity: 80, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'hetcakes diabeticos.jpg',
    name: 'Hotcakes Diabéticos de Harina de Almendra',
    category: 'desayuno',
    description: 'Hotcakes keto ultra bajos en carbohidratos hechos con harina de almendras y esencia de vainilla.',
    tags: ['diabetes', 'hotcakes', 'harina-almendra', 'keto'],
    foods: [
      { name: 'Almendras', quantity: 40, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Leche entera', quantity: 50, unit: 'ml' }
    ]
  },
  {
    imageFile: 'hetcakes diabeticos.jpg',
    name: 'Hotcakes Diabéticos de Coco (Keto)',
    category: 'desayuno',
    description: 'Hotcakes Keto de harina de coco suave con huevos y leche.',
    tags: ['diabetes', 'hotcakes', 'coco', 'keto'],
    foods: [
      { name: 'Coco rallado', quantity: 30, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Leche entera', quantity: 50, unit: 'ml' }
    ]
  },

  // 10. hipertension 2.jpg (15 Menús Plan Hipertensión Hiposódico)
  // Lunes
  {
    imageFile: 'hipertension 2.jpg',
    name: 'Hipertensión Lunes - Desayuno: Avena con Frutas y Nueces',
    category: 'desayuno',
    description: 'Avena tibia sin sal añadida con frutas picadas y nueces.',
    tags: ['hipertension', 'hiposodico', 'desayuno', 'lunes'],
    foods: [
      { name: 'Avena', quantity: 40, unit: 'g' },
      { name: 'Frutas variadas', quantity: 60, unit: 'g' },
      { name: 'Nueces', quantity: 15, unit: 'g' }
    ]
  },
  {
    imageFile: 'hipertension 2.jpg',
    name: 'Hipertensión Lunes - Almuerzo: Pollo a la Plancha con Quinoa y Ensalada',
    category: 'almuerzo',
    description: 'Pechuga de pollo a la plancha condimentada con hierbas finas (sin sal), quinoa y ensalada.',
    tags: ['hipertension', 'hiposodico', 'almuerzo', 'lunes'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Quinoa cocida', quantity: 100, unit: 'g' },
      { name: 'Ensalada mixta', quantity: 80, unit: 'g' }
    ]
  },
  {
    imageFile: 'hipertension 2.jpg',
    name: 'Hipertensión Lunes - Cena: Sopa de Verduras y Legumbres',
    category: 'cena',
    description: 'Sopa casera sin sodio con variedad de verduras y lentejas.',
    tags: ['hipertension', 'hiposodico', 'cena', 'lunes'],
    foods: [
      { name: 'Sopa de verduras', quantity: 200, unit: 'g' },
      { name: 'Lentejas cocidas', quantity: 60, unit: 'g' }
    ]
  },
  // Martes
  {
    imageFile: 'hipertension 2.jpg',
    name: 'Hipertensión Martes - Desayuno: Tostada de Aguacate y Huevo',
    category: 'desayuno',
    description: 'Tostada de pan integral sin sal con aguacate majado y huevo pochado.',
    tags: ['hipertension', 'hiposodico', 'desayuno', 'martes'],
    foods: [
      { name: 'Pan integral', quantity: 30, unit: 'g' },
      { name: 'Aguacate', quantity: 40, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'hipertension 2.jpg',
    name: 'Hipertensión Martes - Almuerzo: Pescado al Horno con Camote',
    category: 'almuerzo',
    description: 'Filete de pescado blanco al horno con camote sancochado y ensalada verde.',
    tags: ['hipertension', 'hiposodico', 'almuerzo', 'martes'],
    foods: [
      { name: 'Pescado blanco', quantity: 150, unit: 'g' },
      { name: 'Camote / Batata', quantity: 100, unit: 'g' },
      { name: 'Lechuga', quantity: 60, unit: 'g' }
    ]
  },
  {
    imageFile: 'hipertension 2.jpg',
    name: 'Hipertensión Martes - Cena: Ensalada de Atún Bajo en Sodio',
    category: 'cena',
    description: 'Atún al natural desmenuzado sobre lechuga, tomate y pepino con aceite de oliva.',
    tags: ['hipertension', 'hiposodico', 'cena', 'martes'],
    foods: [
      { name: 'Atún en agua', quantity: 100, unit: 'g' },
      { name: 'Tomate', quantity: 60, unit: 'g' },
      { name: 'Pepino', quantity: 50, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 8, unit: 'g' }
    ]
  },
  // Miércoles
  {
    imageFile: 'hipertension 2.jpg',
    name: 'Hipertensión Miércoles - Desayuno: Yogur Natural con Frutas y Avena',
    category: 'desayuno',
    description: 'Yogur sin azúcar con rodajas de fruta fresca y hojuelas de avena.',
    tags: ['hipertension', 'hiposodico', 'desayuno', 'miercoles'],
    foods: [
      { name: 'Yogur natural', quantity: 150, unit: 'g' },
      { name: 'Frutas variadas', quantity: 60, unit: 'g' },
      { name: 'Avena', quantity: 20, unit: 'g' }
    ]
  },
  {
    imageFile: 'hipertension 2.jpg',
    name: 'Hipertensión Miércoles - Almuerzo: Lentejas Guisadas con Arroz Integral',
    category: 'almuerzo',
    description: 'Lentejas guisadas con comino y laurel servidas con arroz integral.',
    tags: ['hipertension', 'hiposodico', 'almuerzo', 'miercoles'],
    foods: [
      { name: 'Lentejas cocidas', quantity: 160, unit: 'g' },
      { name: 'Arroz integral', quantity: 100, unit: 'g' }
    ]
  },
  {
    imageFile: 'hipertension 2.jpg',
    name: 'Hipertensión Miércoles - Cena: Pollo a la Plancha con Verduras al Vapor',
    category: 'cena',
    description: 'Pechuga de pollo a la plancha con brócoli y zanahoria al vapor.',
    tags: ['hipertension', 'hiposodico', 'cena', 'miercoles'],
    foods: [
      { name: 'Pollo pechuga', quantity: 140, unit: 'g' },
      { name: 'Brócoli', quantity: 80, unit: 'g' },
      { name: 'Zanahoria', quantity: 50, unit: 'g' }
    ]
  },
  // Jueves
  {
    imageFile: 'hipertension 2.jpg',
    name: 'Hipertensión Jueves - Desayuno: Batido de Frutas con Leche Descremada',
    category: 'desayuno',
    description: 'Batido de fresas o banana con leche descremada.',
    tags: ['hipertension', 'hiposodico', 'desayuno', 'jueves'],
    foods: [
      { name: 'Frutas variadas', quantity: 100, unit: 'g' },
      { name: 'Leche entera', quantity: 200, unit: 'ml' }
    ]
  },
  {
    imageFile: 'hipertension 2.jpg',
    name: 'Hipertensión Jueves - Almuerzo: Pavo al Horno con Quinoa',
    category: 'almuerzo',
    description: 'Pechuga de pavo al horno condimentada con romero y quinoa con vegetales.',
    tags: ['hipertension', 'hiposodico', 'almuerzo', 'jueves'],
    foods: [
      { name: 'Pechuga de pavo', quantity: 150, unit: 'g' },
      { name: 'Quinoa cocida', quantity: 100, unit: 'g' },
      { name: 'Verduras mixtas', quantity: 60, unit: 'g' }
    ]
  },
  {
    imageFile: 'hipertension 2.jpg',
    name: 'Hipertensión Jueves - Cena: Crema de Calabaza con Semillas',
    category: 'cena',
    description: 'Crema suave de auyama/calabaza decorada con semillas de calabaza (sin sal).',
    tags: ['hipertension', 'hiposodico', 'cena', 'jueves'],
    foods: [
      { name: 'Sopa de verduras', quantity: 200, unit: 'g' },
      { name: 'Semillas de calabaza', quantity: 15, unit: 'g' }
    ]
  },

  // 11. merienda diabeticos.jpg (4 Meriendas para Diabéticos)
  {
    imageFile: 'merienda diabeticos.jpg',
    name: 'Merienda Diabética: Manzana Verde con Mantequilla de Maní',
    category: 'snack',
    description: 'Combinación perfecta de fibra y grasa saludable para evitar picos de glucosa.',
    tags: ['diabetes', 'snack', 'manzana-verde', 'mantequilla-mani'],
    foods: [
      { name: 'Manzana verde', quantity: 100, unit: 'g' },
      { name: 'Mantequilla de maní', quantity: 20, unit: 'g' }
    ]
  },
  {
    imageFile: 'merienda diabeticos.jpg',
    name: 'Merienda Diabética: Arándanos con Semillas de Chía',
    category: 'snack',
    description: 'Porción pequeña rica en antioxidantes y fibra saciante.',
    tags: ['diabetes', 'snack', 'arandanos', 'chia'],
    foods: [
      { name: 'Arándanos', quantity: 60, unit: 'g' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'merienda diabeticos.jpg',
    name: 'Merienda Diabética: Yogurt Natural con Nueces Saciantes',
    category: 'snack',
    description: 'Yogur cremoso rico en proteína con nueces para reducir la ansiedad por dulce.',
    tags: ['diabetes', 'snack', 'yogur', 'nueces'],
    foods: [
      { name: 'Yogur natural', quantity: 150, unit: 'g' },
      { name: 'Nueces', quantity: 20, unit: 'g' }
    ]
  },

  // 12. sopa para diabeticos.jpg (6 Sopas Terapéuticas para Diabéticos)
  {
    imageFile: 'sopa para diabeticos.jpg',
    name: 'Sopa Diabética de Verduras Sin Almidón',
    category: 'cena',
    description: 'Sopa reconfortante de espinaca, apio, calabacín y zanahoria baja en calorías.',
    tags: ['diabetes', 'sopa', 'bajo-ig', 'verduras'],
    foods: [
      { name: 'Sopa de verduras', quantity: 250, unit: 'g' }
    ]
  },
  {
    imageFile: 'sopa para diabeticos.jpg',
    name: 'Sopa Diabética de Pollo y Vegetales',
    category: 'almuerzo',
    description: 'Caldo de pechuga de pollo desmenuzada con verduras frescas.',
    tags: ['diabetes', 'sopa', 'pollo', 'proteico'],
    foods: [
      { name: 'Pollo pechuga', quantity: 100, unit: 'g' },
      { name: 'Sopa de verduras', quantity: 200, unit: 'g' }
    ]
  },
  {
    imageFile: 'sopa para diabeticos.jpg',
    name: 'Crema Diabética de Brócoli al Vapor',
    category: 'cena',
    description: 'Crema suave de brócoli al vapor sin crema de leche ni harinas.',
    tags: ['diabetes', 'crema', 'brocoli', 'bajo-ig'],
    foods: [
      { name: 'Brócoli', quantity: 180, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 5, unit: 'g' }
    ]
  },
  {
    imageFile: 'sopa para diabeticos.jpg',
    name: 'Caldo Nutritivo de Res y Verduras',
    category: 'almuerzo',
    description: 'Caldo magro de res condimentado con verduras de hoja verde.',
    tags: ['diabetes', 'caldo', 'carne', 'nutritivo'],
    foods: [
      { name: 'Carne de res magra', quantity: 100, unit: 'g' },
      { name: 'Sopa de verduras', quantity: 200, unit: 'g' }
    ]
  },

  // 13. ensalada garbanzo.jpg (1 Ensalada)
  {
    imageFile: 'ensalada garbanzo.jpg',
    name: 'Ensalada de Garbanzos y Atún con Vinagreta de Oliva',
    category: 'almuerzo',
    description: 'Garbanzos cocidos con atún en conserva, tomate fresco, cebolla picada y vinagreta de aceite de oliva.',
    tags: ['almuerzo', 'garbanzos', 'atun', 'mediterraneo', 'vinagreta'],
    foods: [
      { name: 'Garbanzos', quantity: 120, unit: 'g' },
      { name: 'Atún en agua', quantity: 100, unit: 'g' },
      { name: 'Tomate', quantity: 60, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 12, unit: 'g' }
    ]
  },

  // 14. ensaladas completas.jpg (5 Ensaladas de Plato Único)
  {
    imageFile: 'ensaladas completas.jpg',
    name: 'Ensalada César Saludable con Pollo',
    category: 'almuerzo',
    description: 'Lechuga fresca, pechuga de pollo a la plancha, virutas de parmesano y crutones de pan integral.',
    tags: ['ensalada', 'cesar', 'pollo', 'plato-unico'],
    foods: [
      { name: 'Lechuga', quantity: 80, unit: 'g' },
      { name: 'Pollo pechuga', quantity: 140, unit: 'g' },
      { name: 'Queso Mozzarella', quantity: 30, unit: 'g' },
      { name: 'Pan integral', quantity: 20, unit: 'g' }
    ]
  },
  {
    imageFile: 'ensaladas completas.jpg',
    name: 'Ensalada Tibia de Lentejas y Queso de Cabra',
    category: 'almuerzo',
    description: 'Lentejas tibias con zanahoria, queso de cabra/fresco, nueces y aderezo de mostaza.',
    tags: ['ensalada', 'lentejas', 'queso-fresco', 'nueces'],
    foods: [
      { name: 'Lentejas cocidas', quantity: 140, unit: 'g' },
      { name: 'Queso fresco', quantity: 40, unit: 'g' },
      { name: 'Zanahoria', quantity: 40, unit: 'g' },
      { name: 'Nueces', quantity: 15, unit: 'g' }
    ]
  },
  {
    imageFile: 'ensaladas completas.jpg',
    name: 'Ensalada Mediterránea de Garbanzos y Feta',
    category: 'almuerzo',
    description: 'Garbanzos cocidos, tomate fresco, pepino, queso feta y aceitunas con aceite de oliva virgen extra.',
    tags: ['ensalada', 'garbanzos', 'feta', 'mediterranea'],
    foods: [
      { name: 'Garbanzos', quantity: 140, unit: 'g' },
      { name: 'Tomate', quantity: 60, unit: 'g' },
      { name: 'Pepino', quantity: 50, unit: 'g' },
      { name: 'Queso Feta', quantity: 30, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'ensaladas completas.jpg',
    name: 'Ensalada de Pasta Integral con Atún y Alcaparras',
    category: 'almuerzo',
    description: 'Pasta fusilli integral con atún en agua, tomates cherry, aceitunas y toquecito de limón.',
    tags: ['ensalada', 'pasta-integral', 'atun', 'alcaparras'],
    foods: [
      { name: 'Pasta cocida', quantity: 120, unit: 'g' },
      { name: 'Atún en agua', quantity: 100, unit: 'g' },
      { name: 'Tomate cherry', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'ensaladas completas.jpg',
    name: 'Ensalada Waldorf Saludable con Yogur Griego',
    category: 'snack',
    description: 'Manzana picada, apio crujiente, nueces picadas y uvas aderezadas con yogur griego.',
    tags: ['ensalada', 'waldorf', 'manzana', 'nueces', 'yogur-griego'],
    foods: [
      { name: 'Manzana', quantity: 80, unit: 'g' },
      { name: 'Apio', quantity: 40, unit: 'g' },
      { name: 'Nueces', quantity: 20, unit: 'g' },
      { name: 'Yogur griego', quantity: 60, unit: 'g' }
    ]
  },

  // 15. ensaladas con pollo.jpg (1 Ensalada Proteica)
  {
    imageFile: 'ensaladas con pollo.jpg',
    name: 'Ensalada Fresca de Pollo a la Plancha y Aguacate',
    category: 'almuerzo',
    description: 'Pechuga de pollo dorada a la plancha sobre lechuga, tomate, pepino y palta con aceite de oliva.',
    tags: ['ensalada', 'pollo', 'aguacate', 'pepino', 'proteica'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Lechuga', quantity: 60, unit: 'g' },
      { name: 'Tomate', quantity: 50, unit: 'g' },
      { name: 'Pepino', quantity: 40, unit: 'g' },
      { name: 'Aguacate', quantity: 40, unit: 'g' }
    ]
  }
];

function buildRichPathologyDescription(menu) {
  const baseDesc = menu.description || '';
  if (baseDesc.includes('Preparación:')) return baseDesc;

  const nameLower = menu.name.toLowerCase();
  let prepSteps = [];

  if (nameLower.includes('licuado') || nameLower.includes('batido') || nameLower.includes('smoothie')) {
    prepSteps = [
      '1. Lavar y cortar los vegetales y frutas recomendadas.',
      '2. Colocar en la licuadora junto con la base líquida (agua, té o leche descremada).',
      '3. Procesar a alta velocidad durante 60 segundos hasta homogenizar.',
      '4. Tomar fresco sin colar para aprovechar toda la fibra saciante.'
    ];
  } else if (nameLower.includes('tortitas') || nameLower.includes('crepas') || nameLower.includes('hotcakes')) {
    prepSteps = [
      '1. Procesar o integrar los ingredientes en un bowl hasta lograr una masa fluida y pareja.',
      '2. Pincelar una sartén antiadherente con unas gotas de aceite de oliva.',
      '3. Cocinar las porciones a fuego medio durante 2-3 minutos por lado.',
      '4. Servir tibias con vegetales o toppings permitidos.'
    ];
  } else if (nameLower.includes('sopa') || nameLower.includes('caldo') || nameLower.includes('crema') || nameLower.includes('estofado')) {
    prepSteps = [
      '1. Cocinar las verduras y/o legumbres en agua o caldo casero sin sal añadida.',
      '2. Condimentar con hierbas aromáticas antiinflamatorias (laurel, comino, cúrcuma o tomillo).',
      '3. Cocinar a fuego lento durante 20 minutos hasta que estén muy tiernas.',
      '4. Servir bien caliente o procesar para lograr textura de crema.'
    ];
  } else if (nameLower.includes('ensalada')) {
    prepSteps = [
      '1. Lavar y desinfectar las hojas verdes y hortalizas frescas.',
      '2. Cortar en bocados pequeños e incorporar la proteína (pollo, atún, garbanzos o huevos).',
      '3. Emulsionar el aceite de oliva con zumo de limón o vinagre de manzana.',
      '4. Aderezar justo antes de servir para preservar la crocantez.'
    ];
  } else {
    // Salteados / Platos Fuertes
    prepSteps = [
      '1. Cocinar las proteínas magras (pollo, pescado o carne) a la plancha u horno con especias naturales.',
      '2. Cocinar los vegetales al vapor o saltearlos al wok con 1 cdta de aceite de oliva.',
      '3. Combinar con el carbohidrato de bajo índice glucémico (quinoa, camote o arroz integral).',
      '4. Servir caliente cuidando las proporciones del plato.'
    ];
  }

  return `${baseDesc}\n\n👩‍🍳 Preparación:\n${prepSteps.join('\n')}`;
}

const enrichedPathologyMenus = pathologyMenus.map(m => ({
  ...m,
  description: buildRichPathologyDescription(m)
}));

const outputPath = path.join(__dirname, 'seed-data', 'menus-pathology-extracted.json');
fs.writeFileSync(outputPath, JSON.stringify(enrichedPathologyMenus, null, 2), 'utf8');
console.log(`✨ Generados ${enrichedPathologyMenus.length} menús de patologías en ${outputPath}`);
