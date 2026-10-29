const fs = require('fs');
const path = require('path');

const granularMenus = [
  // 1. 06cea6e78adbcada3458f8f86d748b4a.jpg (4 Sándwiches)
  {
    imageFile: '06cea6e78adbcada3458f8f86d748b4a.jpg',
    name: 'Sándwich de Huevo y Aguacate',
    category: 'desayuno',
    description: 'Sándwich saludable con pan integral, huevo entero y aguacate.',
    tags: ['desayuno', 'sandwich', 'huevo', 'facil'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Aguacate', quantity: 30, unit: 'g' },
      { name: 'Lechuga', quantity: 20, unit: 'g' }
    ]
  },
  {
    imageFile: '06cea6e78adbcada3458f8f86d748b4a.jpg',
    name: 'Sándwich de Atún y Hummus',
    category: 'almuerzo',
    description: 'Sándwich de atún en agua con hummus, tomate y lechuga en pan integral.',
    tags: ['almuerzo', 'sandwich', 'atun', 'proteico'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Atún en agua', quantity: 100, unit: 'g' },
      { name: 'Hummus', quantity: 30, unit: 'g' },
      { name: 'Tomate', quantity: 40, unit: 'g' },
      { name: 'Lechuga', quantity: 20, unit: 'g' }
    ]
  },
  {
    imageFile: '06cea6e78adbcada3458f8f86d748b4a.jpg',
    name: 'Sándwich de Pollo a la Plancha',
    category: 'almuerzo',
    description: 'Sándwich de pechuga de pollo a la plancha con espinaca y tomate.',
    tags: ['almuerzo', 'sandwich', 'pollo', 'proteico'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Pollo pechuga', quantity: 120, unit: 'g' },
      { name: 'Espinaca', quantity: 25, unit: 'g' },
      { name: 'Tomate', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: '06cea6e78adbcada3458f8f86d748b4a.jpg',
    name: 'Sándwich Caprese con Mozzarella',
    category: 'cena',
    description: 'Sándwich fresco de queso mozzarella, tomate y albahaca fresca.',
    tags: ['cena', 'sandwich', 'queso', 'mediterraneo'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Queso Mozzarella', quantity: 50, unit: 'g' },
      { name: 'Tomate', quantity: 50, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 5, unit: 'g' }
    ]
  },

  // 2. 4d2941a48a7d1f814a8f34204754da9f.jpg (6 Meal Prep Bowls)
  {
    imageFile: '4d2941a48a7d1f814a8f34204754da9f.jpg',
    name: 'Chicken Rice Bowl',
    category: 'almuerzo',
    description: 'Bowl de pechuga de pollo, arroz blanco y brócoli al vapor.',
    tags: ['almuerzo', 'bowl', 'meal-prep', 'pollo'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Arroz blanco', quantity: 150, unit: 'g' },
      { name: 'Brócoli', quantity: 100, unit: 'g' }
    ]
  },
  {
    imageFile: '4d2941a48a7d1f814a8f34204754da9f.jpg',
    name: 'Beef Potato Lunch Box',
    category: 'almuerzo',
    description: 'Carne magra de res con papas baby y vegetales verdes.',
    tags: ['almuerzo', 'carne', 'papa', 'meal-prep'],
    foods: [
      { name: 'Carne de res magra', quantity: 150, unit: 'g' },
      { name: 'Papas baby', quantity: 150, unit: 'g' },
      { name: 'Espinaca', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: '4d2941a48a7d1f814a8f34204754da9f.jpg',
    name: 'Buckwheat Chicken Box',
    category: 'almuerzo',
    description: 'Trigo sarraceno con pollo cocido y vegetales.',
    tags: ['almuerzo', 'trigo-sarraceno', 'pollo'],
    foods: [
      { name: 'Trigo sarraceno', quantity: 150, unit: 'g' },
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Zanahoria', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: '4d2941a48a7d1f814a8f34204754da9f.jpg',
    name: 'Pasta Chicken Salad Box',
    category: 'almuerzo',
    description: 'Pasta cocida con pollo desmenuzado, pepino y tomates.',
    tags: ['almuerzo', 'pasta', 'pollo', 'ensalada'],
    foods: [
      { name: 'Pasta cocida', quantity: 150, unit: 'g' },
      { name: 'Pollo pechuga', quantity: 130, unit: 'g' },
      { name: 'Pepino', quantity: 50, unit: 'g' },
      { name: 'Tomate cherry', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: '4d2941a48a7d1f814a8f34204754da9f.jpg',
    name: 'Beef Rice Meal',
    category: 'almuerzo',
    description: 'Carne magra salteada con arroz blanco y vegetales mixtos.',
    tags: ['almuerzo', 'carne', 'arroz'],
    foods: [
      { name: 'Carne de res magra', quantity: 150, unit: 'g' },
      { name: 'Arroz blanco', quantity: 150, unit: 'g' },
      { name: 'Verduras mixtas', quantity: 80, unit: 'g' }
    ]
  },
  {
    imageFile: '4d2941a48a7d1f814a8f34204754da9f.jpg',
    name: 'Chicken Potato Meal',
    category: 'almuerzo',
    description: 'Pechuga de pollo a la plancha con papas sancochadas y ensalada verde.',
    tags: ['almuerzo', 'pollo', 'papa'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Papa', quantity: 150, unit: 'g' },
      { name: 'Lechuga', quantity: 50, unit: 'g' }
    ]
  },

  // 3. 65ec7afdfb806d2de93c20ba54c944d7.jpg (6 Fitness Bowls)
  {
    imageFile: '65ec7afdfb806d2de93c20ba54c944d7.jpg',
    name: 'Plato Vegetariano con Huevo y Maíz',
    category: 'almuerzo',
    description: 'Huevos sancochados con maíz dulce, pepino, tomate cherry y lechuga.',
    tags: ['almuerzo', 'vegetariano', 'huevo', 'maiz'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Maíz dulce', quantity: 80, unit: 'g' },
      { name: 'Tomate cherry', quantity: 50, unit: 'g' },
      { name: 'Pepino', quantity: 50, unit: 'g' },
      { name: 'Lechuga', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: '65ec7afdfb806d2de93c20ba54c944d7.jpg',
    name: 'Plato Tropical Proteico con Camote y Aguacate',
    category: 'almuerzo',
    description: 'Camote al horno con choclo en mazorca, huevos sancochados, palta y pitahaya.',
    tags: ['almuerzo', 'camote', 'huevo', 'aguacate', 'tropical'],
    foods: [
      { name: 'Camote / Batata', quantity: 120, unit: 'g' },
      { name: 'Maíz dulce', quantity: 80, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Aguacate', quantity: 50, unit: 'g' },
      { name: 'Frutas variadas', quantity: 60, unit: 'g' }
    ]
  },
  {
    imageFile: '65ec7afdfb806d2de93c20ba54c944d7.jpg',
    name: 'Plato Fitness: Pollo, Brócoli, Camote y Huevo',
    category: 'almuerzo',
    description: 'Pechuga de pollo a la plancha con brócoli al vapor, camote sancochado y huevo cocido.',
    tags: ['almuerzo', 'fitness', 'pollo', 'brocoli', 'camote'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Brócoli', quantity: 120, unit: 'g' },
      { name: 'Camote / Batata', quantity: 100, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: '65ec7afdfb806d2de93c20ba54c944d7.jpg',
    name: 'Plato Keto: Salmón, Espárragos, Aguacate y Huevo',
    category: 'cena',
    description: 'Filete de salmón a la plancha con espárragos salteados, palta en cubos, huevo mollet y tomate cherry.',
    tags: ['cena', 'keto', 'salmon', 'esparragos', 'aguacate'],
    foods: [
      { name: 'Salmón', quantity: 150, unit: 'g' },
      { name: 'Espárragos', quantity: 80, unit: 'g' },
      { name: 'Aguacate', quantity: 50, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Tomate cherry', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: '65ec7afdfb806d2de93c20ba54c944d7.jpg',
    name: 'Plato Fresco de Pollo y Vegetales Mixtos',
    category: 'almuerzo',
    description: 'Pechuga de pollo fileteada sobre cama de lechuga, pepino, zanahoria rallada y repollo morado.',
    tags: ['almuerzo', 'pollo', 'ensalada', 'vegetales'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Lechuga', quantity: 60, unit: 'g' },
      { name: 'Pepino', quantity: 50, unit: 'g' },
      { name: 'Zanahoria', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: '65ec7afdfb806d2de93c20ba54c944d7.jpg',
    name: 'Plato Simple de Camote, Huevo y Pepino',
    category: 'cena',
    description: 'Camote al horno entero con huevos duros y rodajas de pepino fresco.',
    tags: ['cena', 'camote', 'huevo', 'pepino'],
    foods: [
      { name: 'Camote / Batata', quantity: 150, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Pepino', quantity: 60, unit: 'g' }
    ]
  },

  // 4. 6f9f2786140b805dbbb44289cc89fdfc.jpg (5 Ensaladas)
  {
    imageFile: '6f9f2786140b805dbbb44289cc89fdfc.jpg',
    name: 'Ensalada Mediterránea con Queso Feta',
    category: 'almuerzo',
    description: 'Ensalada de lechuga, tomate, pepino y queso feta con aceite de oliva.',
    tags: ['ensalada', 'mediterranea', 'feta'],
    foods: [
      { name: 'Lechuga', quantity: 80, unit: 'g' },
      { name: 'Tomate', quantity: 60, unit: 'g' },
      { name: 'Pepino', quantity: 50, unit: 'g' },
      { name: 'Queso Feta', quantity: 40, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: '6f9f2786140b805dbbb44289cc89fdfc.jpg',
    name: 'Ensalada de Quinoa y Garbanzos',
    category: 'almuerzo',
    description: 'Ensalada rica en fibra con quinoa cocida, garbanzos, maíz y aguacate.',
    tags: ['ensalada', 'quinoa', 'garbanzos', 'vegetariana'],
    foods: [
      { name: 'Quinoa cocida', quantity: 120, unit: 'g' },
      { name: 'Garbanzos', quantity: 80, unit: 'g' },
      { name: 'Maíz dulce', quantity: 40, unit: 'g' },
      { name: 'Aguacate', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: '6f9f2786140b805dbbb44289cc89fdfc.jpg',
    name: 'Ensalada de Pollo y Espinacas',
    category: 'almuerzo',
    description: 'Pollo a la parrilla servido sobre espinacas frescas, tomate y palta.',
    tags: ['ensalada', 'pollo', 'espinaca', 'proteica'],
    foods: [
      { name: 'Pollo pechuga', quantity: 140, unit: 'g' },
      { name: 'Espinaca', quantity: 60, unit: 'g' },
      { name: 'Tomate', quantity: 50, unit: 'g' },
      { name: 'Aguacate', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: '6f9f2786140b805dbbb44289cc89fdfc.jpg',
    name: 'Ensalada Nizoide con Atún y Huevo',
    category: 'almuerzo',
    description: 'Atún en agua con huevo duro, papas baby y verduras.',
    tags: ['ensalada', 'atun', 'huevo'],
    foods: [
      { name: 'Atún en agua', quantity: 100, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' },
      { name: 'Papas baby', quantity: 80, unit: 'g' },
      { name: 'Lechuga', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: '6f9f2786140b805dbbb44289cc89fdfc.jpg',
    name: 'Ensalada Caprese con Pesto',
    category: 'cena',
    description: 'Tomate, mozzarella fresca, albahaca y pesto de oliva.',
    tags: ['ensalada', 'caprese', 'pesto'],
    foods: [
      { name: 'Tomate', quantity: 100, unit: 'g' },
      { name: 'Queso Mozzarella', quantity: 60, unit: 'g' },
      { name: 'Pesto', quantity: 15, unit: 'g' }
    ]
  },

  // 5. Menu saludable.jpg (21 Comidas)
  // Lunes
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Desayuno Lunes: Huevos Cocidos y Naranja',
    category: 'desayuno',
    description: 'Huevos cocidos con naranja fresca.',
    tags: ['plan-semanal', 'lunes', 'desayuno'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Naranja', quantity: 120, unit: 'g' }
    ]
  },
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Almuerzo Lunes: Pollo a la Plancha con Ensalada',
    category: 'almuerzo',
    description: 'Pechuga de pollo a la plancha con ensalada mixta.',
    tags: ['plan-semanal', 'lunes', 'almuerzo'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Ensalada mixta', quantity: 100, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 5, unit: 'g' }
    ]
  },
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Cena Lunes: Huevos Revueltos con Espinaca',
    category: 'cena',
    description: 'Huevos revueltos ligeros con espinacas frescas.',
    tags: ['plan-semanal', 'lunes', 'cena'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Espinaca', quantity: 50, unit: 'g' }
    ]
  },
  // Martes
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Desayuno Martes: Omelette de Tomate',
    category: 'desayuno',
    description: 'Omelette de huevos con tomate picado.',
    tags: ['plan-semanal', 'martes', 'desayuno'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Tomate', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Almuerzo Martes: Carne Magra con Ensalada de Pepino',
    category: 'almuerzo',
    description: 'Carne magra a la plancha con refrescante ensalada de pepino.',
    tags: ['plan-semanal', 'martes', 'almuerzo'],
    foods: [
      { name: 'Carne de res magra', quantity: 150, unit: 'g' },
      { name: 'Pepino', quantity: 100, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 5, unit: 'g' }
    ]
  },
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Cena Martes: Atún con Huevo y Ensalada',
    category: 'cena',
    description: 'Atún en agua con 1 huevo duro y vegetales.',
    tags: ['plan-semanal', 'martes', 'cena'],
    foods: [
      { name: 'Atún en agua', quantity: 100, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' },
      { name: 'Lechuga', quantity: 50, unit: 'g' }
    ]
  },
  // Miércoles
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Desayuno Miércoles: Huevos con Papaya',
    category: 'desayuno',
    description: 'Huevos revueltos acompañados de papaya fresca.',
    tags: ['plan-semanal', 'miercoles', 'desayuno'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Papaya', quantity: 120, unit: 'g' }
    ]
  },
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Almuerzo Miércoles: Pescado al Vapor con Brócoli',
    category: 'almuerzo',
    description: 'Pescado blanco al vapor con brócoli.',
    tags: ['plan-semanal', 'miercoles', 'almuerzo'],
    foods: [
      { name: 'Pescado blanco', quantity: 160, unit: 'g' },
      { name: 'Brócoli', quantity: 120, unit: 'g' }
    ]
  },
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Cena Miércoles: Huevos Cocidos con Ensalada Verde',
    category: 'cena',
    description: 'Huevos cocidos con ensalada de hojas verdes.',
    tags: ['plan-semanal', 'miercoles', 'cena'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Lechuga', quantity: 50, unit: 'g' },
      { name: 'Pepino', quantity: 40, unit: 'g' }
    ]
  },
  // Jueves
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Desayuno Jueves: Huevos con Camote',
    category: 'desayuno',
    description: 'Huevos cocidos servidos con camote / batata sancochada.',
    tags: ['plan-semanal', 'jueves', 'desayuno'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Camote / Batata', quantity: 80, unit: 'g' }
    ]
  },
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Almuerzo Jueves: Pollo al Horno con Ensalada',
    category: 'almuerzo',
    description: 'Pechuga de pollo al horno servida con ensalada fresca.',
    tags: ['plan-semanal', 'jueves', 'almuerzo'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Ensalada mixta', quantity: 100, unit: 'g' }
    ]
  },
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Cena Jueves: Huevo con Aguacate y Ensalada',
    category: 'cena',
    description: 'Huevo cocido con aguacate y tomate.',
    tags: ['plan-semanal', 'jueves', 'cena'],
    foods: [
      { name: 'Huevo entero', quantity: 50, unit: 'g' },
      { name: 'Aguacate', quantity: 40, unit: 'g' },
      { name: 'Tomate', quantity: 50, unit: 'g' }
    ]
  },
  // Viernes
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Desayuno Viernes: Omelette con Espinaca',
    category: 'desayuno',
    description: 'Omelette proteico de huevos con espinaca salteada.',
    tags: ['plan-semanal', 'viernes', 'desayuno'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Espinaca', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Almuerzo Viernes: Carne Magra con Ensalada',
    category: 'almuerzo',
    description: 'Carne magra a la parrilla con abundante ensalada verde.',
    tags: ['plan-semanal', 'viernes', 'almuerzo'],
    foods: [
      { name: 'Carne de res magra', quantity: 150, unit: 'g' },
      { name: 'Lechuga', quantity: 60, unit: 'g' },
      { name: 'Tomate', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Cena Viernes: Huevos y Ensalada Mixta',
    category: 'cena',
    description: 'Huevos duros cortados sobre ensalada mixta.',
    tags: ['plan-semanal', 'viernes', 'cena'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Ensalada mixta', quantity: 80, unit: 'g' }
    ]
  },
  // Sábado
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Desayuno Sábado: Yogur Natural con Frutas y Chía',
    category: 'desayuno',
    description: 'Yogur natural cremoso con fruta de estación y semillas de chía.',
    tags: ['plan-semanal', 'sabado', 'desayuno'],
    foods: [
      { name: 'Yogur natural', quantity: 150, unit: 'g' },
      { name: 'Frutas variadas', quantity: 60, unit: 'g' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Almuerzo Sábado: Salmón con Quinoa y Verduras',
    category: 'almuerzo',
    description: 'Filete de salmón a la plancha con quinoa y verduras al vapor.',
    tags: ['plan-semanal', 'sabado', 'almuerzo'],
    foods: [
      { name: 'Salmón', quantity: 140, unit: 'g' },
      { name: 'Quinoa cocida', quantity: 100, unit: 'g' },
      { name: 'Verduras mixtas', quantity: 80, unit: 'g' }
    ]
  },
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Cena Sábado: Sopa de Lentejas Nutritiva',
    category: 'cena',
    description: 'Sopa casera de lentejas con verduras.',
    tags: ['plan-semanal', 'sabado', 'cena'],
    foods: [
      { name: 'Lentejas cocidas', quantity: 180, unit: 'g' },
      { name: 'Zanahoria', quantity: 40, unit: 'g' }
    ]
  },
  // Domingo
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Desayuno Domingo: Batido de Frutas con Avena',
    category: 'desayuno',
    description: 'Batido energizante de plátano, avena y chía.',
    tags: ['plan-semanal', 'domingo', 'desayuno'],
    foods: [
      { name: 'Plátano', quantity: 100, unit: 'g' },
      { name: 'Avena', quantity: 30, unit: 'g' },
      { name: 'Leche entera', quantity: 200, unit: 'ml' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Almuerzo Domingo: Albóndigas de Pavo con Ensalada',
    category: 'almuerzo',
    description: 'Albóndigas horneadas de pavo molido con ensalada.',
    tags: ['plan-semanal', 'domingo', 'almuerzo'],
    foods: [
      { name: 'Pavo molido', quantity: 150, unit: 'g' },
      { name: 'Ensalada mixta', quantity: 100, unit: 'g' }
    ]
  },
  {
    imageFile: 'Menu saludable.jpg',
    name: 'Cena Domingo: Queso Cottage con Pepino y Tomate',
    category: 'cena',
    description: 'Requesón / Queso cottage ligero con pepino y tomates cherry.',
    tags: ['plan-semanal', 'domingo', 'cena'],
    foods: [
      { name: 'Queso cottage', quantity: 120, unit: 'g' },
      { name: 'Pepino', quantity: 60, unit: 'g' },
      { name: 'Tomate cherry', quantity: 50, unit: 'g' }
    ]
  },

  // 6. Plan 7 dias - saludable.jpg (28 Comidas)
  // Día 1
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 1 - Desayuno: Avena con Chía y Frutos Rojos',
    category: 'desayuno',
    description: 'Avena cocida con semillas de chía y frutos rojos frescos.',
    tags: ['plan-7-dias', 'desayuno', 'dia-1'],
    foods: [
      { name: 'Avena', quantity: 40, unit: 'g' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' },
      { name: 'Frutos rojos', quantity: 50, unit: 'g' },
      { name: 'Leche entera', quantity: 150, unit: 'ml' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 1 - Almuerzo: Pechuga de Pollo con Ensalada y Oliva',
    category: 'almuerzo',
    description: 'Pechuga a la parrilla con ensalada fresca aderezada con aceite de oliva.',
    tags: ['plan-7-dias', 'almuerzo', 'dia-1'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Ensalada mixta', quantity: 100, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 1 - Snack: Té Verde con Almendras',
    category: 'snack',
    description: 'Puñado de almendras tostadas con infusión de té verde.',
    tags: ['plan-7-dias', 'snack', 'dia-1'],
    foods: [
      { name: 'Almendras', quantity: 25, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 1 - Cena: Sopa de Verduras Casera',
    category: 'cena',
    description: 'Sopa reconfortante de verduras variadas.',
    tags: ['plan-7-dias', 'cena', 'dia-1'],
    foods: [
      { name: 'Sopa de verduras', quantity: 250, unit: 'g' }
    ]
  },
  // Día 2
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 2 - Desayuno: 2 Huevos Cocidos con Aguacate',
    category: 'desayuno',
    description: 'Dos huevos cocidos acompañados de palta/aguacate.',
    tags: ['plan-7-dias', 'desayuno', 'dia-2'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Aguacate', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 2 - Almuerzo: Pescado a la Parrilla con Quinoa y Verduras',
    category: 'almuerzo',
    description: 'Pescado blanco a la parrilla con quinoa y vegetales al vapor.',
    tags: ['plan-7-dias', 'almuerzo', 'dia-2'],
    foods: [
      { name: 'Pescado blanco', quantity: 150, unit: 'g' },
      { name: 'Quinoa cocida', quantity: 100, unit: 'g' },
      { name: 'Brócoli', quantity: 80, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 2 - Snack: Té Verde con Nueces',
    category: 'snack',
    description: 'Té verde acompañado de un puñado de nueces.',
    tags: ['plan-7-dias', 'snack', 'dia-2'],
    foods: [
      { name: 'Nueces', quantity: 25, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 2 - Cena: Ensalada Verde con Semillas',
    category: 'cena',
    description: 'Ensalada de lechuga, espinaca y pepino con semillas de chía.',
    tags: ['plan-7-dias', 'cena', 'dia-2'],
    foods: [
      { name: 'Lechuga', quantity: 60, unit: 'g' },
      { name: 'Espinaca', quantity: 40, unit: 'g' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' }
    ]
  },
  // Día 3
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 3 - Desayuno: Batido Verde Detox',
    category: 'desayuno',
    description: 'Batido de espinaca, pepino, manzana verde y limón.',
    tags: ['plan-7-dias', 'desayuno', 'dia-3'],
    foods: [
      { name: 'Espinaca', quantity: 30, unit: 'g' },
      { name: 'Pepino', quantity: 50, unit: 'g' },
      { name: 'Manzana', quantity: 80, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 3 - Almuerzo: Pechuga de Pavo con Batata al Horno',
    category: 'almuerzo',
    description: 'Pavo a la plancha con camote/batata al horno y ensalada.',
    tags: ['plan-7-dias', 'almuerzo', 'dia-3'],
    foods: [
      { name: 'Pechuga de pavo', quantity: 140, unit: 'g' },
      { name: 'Camote / Batata', quantity: 100, unit: 'g' },
      { name: 'Lechuga', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 3 - Snack: Té Verde con Almendras',
    category: 'snack',
    description: 'Almendras naturales con infusión de té verde.',
    tags: ['plan-7-dias', 'snack', 'dia-3'],
    foods: [
      { name: 'Almendras', quantity: 25, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 3 - Cena: Sopa Cremosa de Verduras',
    category: 'cena',
    description: 'Sopa de verduras mixtas.',
    tags: ['plan-7-dias', 'cena', 'dia-3'],
    foods: [
      { name: 'Sopa de verduras', quantity: 250, unit: 'g' }
    ]
  },
  // Día 4
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 4 - Desayuno: Yogur Griego con Chía',
    category: 'desayuno',
    description: 'Yogur griego rico en proteína con semillas de chía.',
    tags: ['plan-7-dias', 'desayuno', 'dia-4'],
    foods: [
      { name: 'Yogur griego', quantity: 150, unit: 'g' },
      { name: 'Semillas de chía', quantity: 15, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 4 - Almuerzo: Salmón al Horno con Ensalada y Oliva',
    category: 'almuerzo',
    description: 'Filete de salmón al horno con ensalada verde y aceite de oliva.',
    tags: ['plan-7-dias', 'almuerzo', 'dia-4'],
    foods: [
      { name: 'Salmón', quantity: 150, unit: 'g' },
      { name: 'Ensalada mixta', quantity: 100, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 4 - Snack: Manzana con Mantequilla de Maní',
    category: 'snack',
    description: 'Manzana crujiente untada con mantequilla de maní natural.',
    tags: ['plan-7-dias', 'snack', 'dia-4'],
    foods: [
      { name: 'Manzana', quantity: 120, unit: 'g' },
      { name: 'Mantequilla de maní', quantity: 25, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 4 - Cena: Verduras Salteadas',
    category: 'cena',
    description: 'Salteado de brócoli, zanahoria y espinacas con aceite de oliva.',
    tags: ['plan-7-dias', 'cena', 'dia-4'],
    foods: [
      { name: 'Verduras mixtas', quantity: 150, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 5, unit: 'g' }
    ]
  },
  // Día 5
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 5 - Desayuno: Avena con Plátano y Nueces',
    category: 'desayuno',
    description: 'Avena tibia con rodajas de plátano y nueces picadas.',
    tags: ['plan-7-dias', 'desayuno', 'dia-5'],
    foods: [
      { name: 'Avena', quantity: 40, unit: 'g' },
      { name: 'Plátano', quantity: 80, unit: 'g' },
      { name: 'Nueces', quantity: 15, unit: 'g' },
      { name: 'Leche entera', quantity: 150, unit: 'ml' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 5 - Almuerzo: Pollo a la Parrilla con Ensalada',
    category: 'almuerzo',
    description: 'Pollo a la parrilla con ensalada fresca de tomate y pepino.',
    tags: ['plan-7-dias', 'almuerzo', 'dia-5'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Tomate', quantity: 60, unit: 'g' },
      { name: 'Pepino', quantity: 60, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 5 - Snack: Té Verde con Almendras',
    category: 'snack',
    description: 'Almendras saludables acompañadas de té verde.',
    tags: ['plan-7-dias', 'snack', 'dia-5'],
    foods: [
      { name: 'Almendras', quantity: 25, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 5 - Cena: Sopa de Verduras',
    category: 'cena',
    description: 'Sopa liviana de vegetal para la cena.',
    tags: ['plan-7-dias', 'cena', 'dia-5'],
    foods: [
      { name: 'Sopa de verduras', quantity: 250, unit: 'g' }
    ]
  },
  // Día 6
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 6 - Desayuno: 2 Huevos Cocidos con Aguacate',
    category: 'desayuno',
    description: 'Huevos hervidos con palta fresca.',
    tags: ['plan-7-dias', 'desayuno', 'dia-6'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Aguacate', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 6 - Almuerzo: Pescado a la Parrilla con Ensalada',
    category: 'almuerzo',
    description: 'Pescado fresco a la parrilla con vegetales salteados o ensalada.',
    tags: ['plan-7-dias', 'almuerzo', 'dia-6'],
    foods: [
      { name: 'Pescado blanco', quantity: 150, unit: 'g' },
      { name: 'Brócoli', quantity: 100, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 6 - Snack: Té Verde con Nueces',
    category: 'snack',
    description: 'Nueces con infusión de té verde.',
    tags: ['plan-7-dias', 'snack', 'dia-6'],
    foods: [
      { name: 'Nueces', quantity: 25, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 6 - Cena: Ensalada con Garbanzos y Vegetales',
    category: 'cena',
    description: 'Ensalada proteica vegetal con garbanzos, tomate y lechuga.',
    tags: ['plan-7-dias', 'cena', 'dia-6'],
    foods: [
      { name: 'Garbanzos', quantity: 100, unit: 'g' },
      { name: 'Tomate', quantity: 50, unit: 'g' },
      { name: 'Lechuga', quantity: 50, unit: 'g' }
    ]
  },
  // Día 7
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 7 - Desayuno: Batido Verde con Chía',
    category: 'desayuno',
    description: 'Batido de espinaca, manzana y semillas de chía.',
    tags: ['plan-7-dias', 'desayuno', 'dia-7'],
    foods: [
      { name: 'Espinaca', quantity: 30, unit: 'g' },
      { name: 'Manzana', quantity: 80, unit: 'g' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 7 - Almuerzo: Pechuga de Pollo con Quinoa y Verduras',
    category: 'almuerzo',
    description: 'Pechuga a la plancha con quinoa cocida y vegetales.',
    tags: ['plan-7-dias', 'almuerzo', 'dia-7'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Quinoa cocida', quantity: 100, unit: 'g' },
      { name: 'Verduras mixtas', quantity: 80, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 7 - Snack: Manzana con Almendras',
    category: 'snack',
    description: 'Manzana fresca con almendras.',
    tags: ['plan-7-dias', 'snack', 'dia-7'],
    foods: [
      { name: 'Manzana', quantity: 120, unit: 'g' },
      { name: 'Almendras', quantity: 20, unit: 'g' }
    ]
  },
  {
    imageFile: 'Plan 7 dias - saludable.jpg',
    name: 'Día 7 - Cena: Sopa de Calabaza y Verduras',
    category: 'cena',
    description: 'Sopa caliente de calabaza y vegetal.',
    tags: ['plan-7-dias', 'cena', 'dia-7'],
    foods: [
      { name: 'Sopa de verduras', quantity: 250, unit: 'g' }
    ]
  },

  // 7. air frier.jpg (8 Recetas Air Fryer)
  {
    imageFile: 'air frier.jpg',
    name: 'Pechuga de Pollo Dorada en Air Fryer',
    category: 'almuerzo',
    description: 'Pechuga de pollo sazonada horneada en freidora de aire a 180°C.',
    tags: ['air-fryer', 'pollo', 'almuerzo', 'proteico'],
    foods: [
      { name: 'Pollo pechuga', quantity: 180, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 5, unit: 'g' }
    ]
  },
  {
    imageFile: 'air frier.jpg',
    name: 'Salmón Crocante en Freidora de Aire',
    category: 'cena',
    description: 'Filete de salmón en air fryer a 180°C con toques de limón.',
    tags: ['air-fryer', 'salmon', 'cena', 'saludable'],
    foods: [
      { name: 'Salmón', quantity: 160, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 5, unit: 'g' }
    ]
  },
  {
    imageFile: 'air frier.jpg',
    name: 'Camarones Salteados en Air Fryer',
    category: 'cena',
    description: 'Camarones sazonados cocidos en air fryer a 180°C en 8 minutos.',
    tags: ['air-fryer', 'camarones', 'cena', 'express'],
    foods: [
      { name: 'Camarones', quantity: 150, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 5, unit: 'g' }
    ]
  },
  {
    imageFile: 'air frier.jpg',
    name: 'Bistec de Res Jugoso en Freidora de Aire',
    category: 'almuerzo',
    description: 'Corte de res magra a 200°C en air fryer.',
    tags: ['air-fryer', 'carne', 'almuerzo'],
    foods: [
      { name: 'Carne de res magra', quantity: 180, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 5, unit: 'g' }
    ]
  },
  {
    imageFile: 'air frier.jpg',
    name: 'Brócoli Asado Crujiente en Air Fryer',
    category: 'snack',
    description: 'Brócoli al dente en air fryer a 180°C.',
    tags: ['air-fryer', 'brocoli', 'vegetales'],
    foods: [
      { name: 'Brócoli', quantity: 150, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 5, unit: 'g' }
    ]
  },
  {
    imageFile: 'air frier.jpg',
    name: 'Papas Baby al Romero en Air Fryer',
    category: 'almuerzo',
    description: 'Papas baby doraditas a 190°C.',
    tags: ['air-fryer', 'papas', 'guarnicion'],
    foods: [
      { name: 'Papas baby', quantity: 180, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 5, unit: 'g' }
    ]
  },
  {
    imageFile: 'air frier.jpg',
    name: 'Verduras Mixtas Asadas en Freidora de Aire',
    category: 'cena',
    description: 'Brócoli, zanahoria y calabacín asados a 180°C.',
    tags: ['air-fryer', 'verduras', 'ligero'],
    foods: [
      { name: 'Verduras mixtas', quantity: 180, unit: 'g' },
      { name: 'Aceite de oliva', quantity: 5, unit: 'g' }
    ]
  },
  {
    imageFile: 'air frier.jpg',
    name: 'Huevos Duros en Air Fryer',
    category: 'desayuno',
    description: 'Huevos cocidos perfectos en air fryer a 170°C por 15 min.',
    tags: ['air-fryer', 'huevo', 'desayuno'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' }
    ]
  },

  // 8. batidos para el desayuno.jpg (4 Batidos)
  {
    imageFile: 'batidos para el desayuno.jpg',
    name: 'Batido de Plátano y Durazno',
    category: 'desayuno',
    description: 'Batido cremoso de plátano, durazno, yogur griego y miel.',
    tags: ['batido', 'desayuno', 'frutas', 'yogur-griego'],
    foods: [
      { name: 'Plátano', quantity: 100, unit: 'g' },
      { name: 'Durazno', quantity: 80, unit: 'g' },
      { name: 'Yogur griego', quantity: 120, unit: 'g' },
      { name: 'Miel', quantity: 15, unit: 'g' }
    ]
  },
  {
    imageFile: 'batidos para el desayuno.jpg',
    name: 'Batido de Fresa y Plátano',
    category: 'desayuno',
    description: 'Batido clásico de fresas frescas, plátano y yogur natural.',
    tags: ['batido', 'desayuno', 'fresa', 'platano'],
    foods: [
      { name: 'Fresas', quantity: 100, unit: 'g' },
      { name: 'Plátano', quantity: 80, unit: 'g' },
      { name: 'Yogur natural', quantity: 120, unit: 'g' }
    ]
  },
  {
    imageFile: 'batidos para el desayuno.jpg',
    name: 'Batido Tropical de Mango y Piña',
    category: 'desayuno',
    description: 'Batido refrescante de mango, piña y yogur griego.',
    tags: ['batido', 'desayuno', 'mango', 'pina', 'tropical'],
    foods: [
      { name: 'Mango', quantity: 80, unit: 'g' },
      { name: 'Piña', quantity: 80, unit: 'g' },
      { name: 'Yogur griego', quantity: 120, unit: 'g' }
    ]
  },
  {
    imageFile: 'batidos para el desayuno.jpg',
    name: 'Batido de Plátano, Café y Cacao',
    category: 'desayuno',
    description: 'Batido proteico y estimulante con plátano, leche, café y cacao en polvo.',
    tags: ['batido', 'desayuno', 'cafe', 'cacao', 'energia'],
    foods: [
      { name: 'Plátano', quantity: 100, unit: 'g' },
      { name: 'Leche entera', quantity: 200, unit: 'ml' },
      { name: 'Cacao en polvo', quantity: 15, unit: 'g' }
    ]
  },

  // 9. cenas ligeras.jpg (3 Cenas)
  {
    imageFile: 'cenas ligeras.jpg',
    name: 'Nordic Bowl de Salmón y Aguacate',
    category: 'cena',
    description: 'Bowl nórdico ligero con salmón ahumado, aguacate, pepino y queso feta.',
    tags: ['cena', 'salmon', 'bowl', 'nordico'],
    foods: [
      { name: 'Salmón ahumado', quantity: 100, unit: 'g' },
      { name: 'Aguacate', quantity: 40, unit: 'g' },
      { name: 'Pepino', quantity: 50, unit: 'g' },
      { name: 'Queso Feta', quantity: 30, unit: 'g' }
    ]
  },
  {
    imageFile: 'cenas ligeras.jpg',
    name: 'Wrap Ligero de Pavo y Vegetales',
    category: 'cena',
    description: 'Wrap de pechuga de pavo con lechuga, tomate y palta.',
    tags: ['cena', 'wrap', 'pavo', 'ligero'],
    foods: [
      { name: 'Pan integral', quantity: 50, unit: 'g' },
      { name: 'Pechuga de pavo', quantity: 100, unit: 'g' },
      { name: 'Lechuga', quantity: 40, unit: 'g' },
      { name: 'Tomate', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'cenas ligeras.jpg',
    name: 'Ensalada Express de Garbanzos y Tomate',
    category: 'cena',
    description: 'Ensalada rápida de garbanzos con tomate, pepino y queso feta.',
    tags: ['cena', 'ensalada', 'garbanzos', 'express'],
    foods: [
      { name: 'Garbanzos', quantity: 120, unit: 'g' },
      { name: 'Tomate', quantity: 60, unit: 'g' },
      { name: 'Pepino', quantity: 50, unit: 'g' },
      { name: 'Queso Feta', quantity: 30, unit: 'g' }
    ]
  },

  // 10. comidas variadas.jpg (14 Comidas Meal Prep: Mon-Sun Lunch & Dinner)
  {
    imageFile: 'comidas variadas.jpg',
    name: 'Chicken Quinoa Bowl (High Protein & Fibre)',
    category: 'almuerzo',
    description: 'Pechuga de pollo, quinoa, garbanzos, pepino y tomate cherry.',
    tags: ['almuerzo', 'meal-prep', 'pollo', 'quinoa'],
    foods: [
      { name: 'Pollo pechuga', quantity: 140, unit: 'g' },
      { name: 'Quinoa cocida', quantity: 100, unit: 'g' },
      { name: 'Garbanzos', quantity: 60, unit: 'g' },
      { name: 'Pepino', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas variadas.jpg',
    name: 'Tuna Pasta Salad (Fresh & Satisfying)',
    category: 'almuerzo',
    description: 'Ensalada de pasta con atún en agua, pepino, tomate cherry y aceitunas.',
    tags: ['almuerzo', 'atun', 'pasta', 'fresco'],
    foods: [
      { name: 'Atún en agua', quantity: 100, unit: 'g' },
      { name: 'Pasta cocida', quantity: 120, unit: 'g' },
      { name: 'Tomate cherry', quantity: 40, unit: 'g' },
      { name: 'Pepino', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas variadas.jpg',
    name: 'Southwest Chicken Bowl con Frijoles y Maíz',
    category: 'almuerzo',
    description: 'Pollo grillado con maíz dulce, frijoles negros y vegetales.',
    tags: ['almuerzo', 'pollo', 'southwest', 'frijoles'],
    foods: [
      { name: 'Pollo pechuga', quantity: 140, unit: 'g' },
      { name: 'Maíz dulce', quantity: 50, unit: 'g' },
      { name: 'Frijoles negros', quantity: 60, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas variadas.jpg',
    name: 'Chickpea Greek Salad con Queso Feta',
    category: 'almuerzo',
    description: 'Garbanzos con queso feta, tomate cherry y pepino.',
    tags: ['almuerzo', 'garbanzos', 'feta', 'vegetariano'],
    foods: [
      { name: 'Garbanzos', quantity: 140, unit: 'g' },
      { name: 'Queso Feta', quantity: 40, unit: 'g' },
      { name: 'Tomate cherry', quantity: 50, unit: 'g' },
      { name: 'Pepino', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas variadas.jpg',
    name: 'Sesame Chicken Bowl con Arroz Integral',
    category: 'almuerzo',
    description: 'Pollo al sésamo con arroz integral, aguacate y zanahoria.',
    tags: ['almuerzo', 'pollo', 'arroz-integral', 'aguacate'],
    foods: [
      { name: 'Pollo pechuga', quantity: 140, unit: 'g' },
      { name: 'Arroz integral', quantity: 120, unit: 'g' },
      { name: 'Aguacate', quantity: 40, unit: 'g' },
      { name: 'Zanahoria', quantity: 30, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas variadas.jpg',
    name: 'Protein Power Box con Camote y Huevo',
    category: 'almuerzo',
    description: 'Pechuga de pollo, camote asado y huevo duro sancochado.',
    tags: ['almuerzo', 'proteico', 'camote', 'huevo'],
    foods: [
      { name: 'Pollo pechuga', quantity: 140, unit: 'g' },
      { name: 'Camote / Batata', quantity: 120, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas variadas.jpg',
    name: 'Turkey & Veggie Box Clean',
    category: 'almuerzo',
    description: 'Pechuga de pavo con espinacas, pepino, queso feta y frutos secos.',
    tags: ['almuerzo', 'pavo', 'espinaca', 'saludable'],
    foods: [
      { name: 'Pechuga de pavo', quantity: 140, unit: 'g' },
      { name: 'Espinaca', quantity: 40, unit: 'g' },
      { name: 'Pepino', quantity: 40, unit: 'g' },
      { name: 'Almendras', quantity: 20, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas variadas.jpg',
    name: 'Air Fryer Lemon Chicken with Sweet Potato & Broccoli',
    category: 'cena',
    description: 'Pollo al limón en air fryer con camote asado y brócoli.',
    tags: ['cena', 'air-fryer', 'pollo', 'camote', 'brocoli'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Camote / Batata', quantity: 100, unit: 'g' },
      { name: 'Brócoli', quantity: 80, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas variadas.jpg',
    name: 'Beef & Broccoli Stir Fry with Brown Rice',
    category: 'cena',
    description: 'Salteado de carne magra con brócoli y arroz integral.',
    tags: ['cena', 'carne', 'brocoli', 'arroz-integral'],
    foods: [
      { name: 'Carne de res magra', quantity: 150, unit: 'g' },
      { name: 'Brócoli', quantity: 100, unit: 'g' },
      { name: 'Arroz integral', quantity: 100, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas variadas.jpg',
    name: 'Garlic Butter Salmon with Asparagus & Quinoa',
    category: 'cena',
    description: 'Salmón a la mantequilla de ajo con espárragos y quinoa.',
    tags: ['cena', 'salmon', 'esparragos', 'quinoa'],
    foods: [
      { name: 'Salmón', quantity: 150, unit: 'g' },
      { name: 'Espárragos', quantity: 80, unit: 'g' },
      { name: 'Quinoa cocida', quantity: 80, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas variadas.jpg',
    name: 'Turkey Meatballs con Zucchini Noodles',
    category: 'cena',
    description: 'Albóndigas de pavo con fideos de calabacín y salsa marinara.',
    tags: ['cena', 'pavo', 'albondigas', 'zucchini'],
    foods: [
      { name: 'Pavo molido', quantity: 150, unit: 'g' },
      { name: 'Verduras mixtas', quantity: 100, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas variadas.jpg',
    name: 'Air Fryer Garlic Shrimp with Broccoli & Rice',
    category: 'cena',
    description: 'Camarones al ajo en air fryer con brócoli y arroz.',
    tags: ['cena', 'camarones', 'air-fryer', 'arroz'],
    foods: [
      { name: 'Camarones', quantity: 150, unit: 'g' },
      { name: 'Brócoli', quantity: 80, unit: 'g' },
      { name: 'Arroz blanco', quantity: 100, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas variadas.jpg',
    name: 'Chicken Fajita Bowls with Rice & Black Beans',
    category: 'cena',
    description: 'Bowl estilo fajita con pollo, pimientos, arroz y frijoles negros.',
    tags: ['cena', 'pollo', 'fajitas', 'frijoles'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Arroz blanco', quantity: 100, unit: 'g' },
      { name: 'Frijoles negros', quantity: 60, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas variadas.jpg',
    name: 'Air Fryer Chicken Thighs with Green Beans & Potatoes',
    category: 'cena',
    description: 'Muslos de pollo dorados en air fryer con vainitas y papas baby.',
    tags: ['cena', 'pollo', 'air-fryer', 'papas'],
    foods: [
      { name: 'Pollo pechuga', quantity: 160, unit: 'g' },
      { name: 'Papas baby', quantity: 100, unit: 'g' },
      { name: 'Verduras mixtas', quantity: 60, unit: 'g' }
    ]
  },

  // 11. comidas.jpg (6 Bowls)
  {
    imageFile: 'comidas.jpg',
    name: 'Teriyaki Chicken Rice Bowl',
    category: 'almuerzo',
    description: 'Bowl de pollo con salsa teriyaki, arroz y vegetales.',
    tags: ['almuerzo', 'bowl', 'pollo', 'teriyaki'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Arroz blanco', quantity: 150, unit: 'g' },
      { name: 'Brócoli', quantity: 80, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas.jpg',
    name: 'Garlic Butter Chicken Bowl',
    category: 'almuerzo',
    description: 'Pechuga de pollo a la mantequilla y ajo con brócoli.',
    tags: ['almuerzo', 'bowl', 'pollo', 'ajo'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Brócoli', quantity: 100, unit: 'g' },
      { name: 'Zanahoria', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas.jpg',
    name: 'Lemon Herb Chicken Bowl con Quinoa',
    category: 'almuerzo',
    description: 'Pollo al limón con hierbas y quinoa cocida.',
    tags: ['almuerzo', 'bowl', 'pollo', 'quinoa'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Quinoa cocida', quantity: 120, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas.jpg',
    name: 'Chicken Burrito Bowl',
    category: 'almuerzo',
    description: 'Bowl estilo burrito con pollo, arroz, frijoles negros y maíz.',
    tags: ['almuerzo', 'bowl', 'burrito', 'frijoles'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Arroz blanco', quantity: 100, unit: 'g' },
      { name: 'Frijoles negros', quantity: 80, unit: 'g' },
      { name: 'Maíz dulce', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas.jpg',
    name: 'BBQ Chicken Bowl',
    category: 'almuerzo',
    description: 'Pollo desmenuzado en salsa BBQ con arroz y vegetal.',
    tags: ['almuerzo', 'bowl', 'pollo', 'bbq'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Arroz blanco', quantity: 150, unit: 'g' }
    ]
  },
  {
    imageFile: 'comidas.jpg',
    name: 'Spicy Chicken Noodle Bowl',
    category: 'almuerzo',
    description: 'Bowl de fideos con pollo salteado especiado.',
    tags: ['almuerzo', 'bowl', 'fideos', 'pollo'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Fideos', quantity: 120, unit: 'g' }
    ]
  },

  // 12. da8710390b8e71cb0ea639a687624111.jpg (9 Platos Saludables)
  {
    imageFile: 'da8710390b8e71cb0ea639a687624111.jpg',
    name: 'Plato Verde: Brócoli, Ejotes y Huevos Cocidos',
    category: 'almuerzo',
    description: 'Brócoli al vapor con vainitas verdes y huevos duros sancochados.',
    tags: ['almuerzo', 'brocoli', 'huevo', 'saludable'],
    foods: [
      { name: 'Brócoli', quantity: 100, unit: 'g' },
      { name: 'Verduras mixtas', quantity: 80, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' }
    ]
  },
  {
    imageFile: 'da8710390b8e71cb0ea639a687624111.jpg',
    name: 'Plato Fresco de Huevos, Hojas Verdes y Maíz',
    category: 'almuerzo',
    description: 'Huevos sancochados sobre colchón de rúcula y maíz dulce.',
    tags: ['almuerzo', 'huevo', 'espinaca', 'maiz'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Espinaca', quantity: 60, unit: 'g' },
      { name: 'Maíz dulce', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'da8710390b8e71cb0ea639a687624111.jpg',
    name: 'Pechuga a la Parrilla con Brócoli y Maíz',
    category: 'almuerzo',
    description: 'Pechuga de pollo marcada a la parrilla con brócoli y choclo desgranado.',
    tags: ['almuerzo', 'pollo', 'brocoli', 'maiz'],
    foods: [
      { name: 'Pollo pechuga', quantity: 150, unit: 'g' },
      { name: 'Brócoli', quantity: 100, unit: 'g' },
      { name: 'Maíz dulce', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'da8710390b8e71cb0ea639a687624111.jpg',
    name: 'Plato Tricolor: Vainitas, Pimientos y Maíz',
    category: 'almuerzo',
    description: 'Combinación ligera de vainitas, pimientos amarillos y maíz dulce.',
    tags: ['almuerzo', 'vegetariano', 'pimiento', 'maiz'],
    foods: [
      { name: 'Verduras mixtas', quantity: 150, unit: 'g' },
      { name: 'Maíz dulce', quantity: 60, unit: 'g' }
    ]
  },
  {
    imageFile: 'da8710390b8e71cb0ea639a687624111.jpg',
    name: 'Pescado Blanco a la Parrilla con Pepino y Vainitas',
    category: 'cena',
    description: 'Filete de pescado blanco a la parrilla con rodajas de pepino y ejotes.',
    tags: ['cena', 'pescado', 'pepino', 'ligero'],
    foods: [
      { name: 'Pescado blanco', quantity: 160, unit: 'g' },
      { name: 'Pepino', quantity: 60, unit: 'g' },
      { name: 'Verduras mixtas', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'da8710390b8e71cb0ea639a687624111.jpg',
    name: 'Brócoli y Huevos Duros con Aderezo Saludable',
    category: 'cena',
    description: 'Ramilletes de brócoli con huevos sancochados y dip de mostaza o humus.',
    tags: ['cena', 'brocoli', 'huevo', 'dip'],
    foods: [
      { name: 'Brócoli', quantity: 120, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Hummus', quantity: 25, unit: 'g' }
    ]
  },
  {
    imageFile: 'da8710390b8e71cb0ea639a687624111.jpg',
    name: 'Pescado Desmenuzado con Pimientos y Huevo',
    category: 'cena',
    description: 'Pescado blanco desmenuzado con pimientos rojos salteados y huevos duros.',
    tags: ['cena', 'pescado', 'pimiento', 'huevo'],
    foods: [
      { name: 'Pescado blanco', quantity: 140, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Verduras mixtas', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'da8710390b8e71cb0ea639a687624111.jpg',
    name: 'Plato Detox: Brócoli, Pepino y Salsa de Tomate',
    category: 'cena',
    description: 'Brócoli al vapor con pepino fresco y salsa dip de tomate casera.',
    tags: ['cena', 'detox', 'brocoli', 'pepino'],
    foods: [
      { name: 'Brócoli', quantity: 120, unit: 'g' },
      { name: 'Pepino', quantity: 80, unit: 'g' },
      { name: 'Tomate', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'da8710390b8e71cb0ea639a687624111.jpg',
    name: 'Ensalada Proteica de Huevos Duros y Hojas Verdes',
    category: 'cena',
    description: 'Huevos sancochados cortados por la mitad sobre hojas de espinaca y ejotes.',
    tags: ['cena', 'huevo', 'espinaca', 'proteico'],
    foods: [
      { name: 'Huevo entero', quantity: 150, unit: 'g' },
      { name: 'Espinaca', quantity: 60, unit: 'g' },
      { name: 'Verduras mixtas', quantity: 40, unit: 'g' }
    ]
  },

  // 13. desayuno proteico.jpg (12 Desayunos)
  {
    imageFile: 'desayuno proteico.jpg',
    name: 'Chia Pudding Bowl Proteico (28g Protein)',
    category: 'desayuno',
    description: 'Pudín de chía con leche, banana, frutos rojos y proteína.',
    tags: ['desayuno', 'chia', 'proteico', 'frutas'],
    foods: [
      { name: 'Semillas de chía', quantity: 20, unit: 'g' },
      { name: 'Leche entera', quantity: 150, unit: 'ml' },
      { name: 'Plátano', quantity: 60, unit: 'g' },
      { name: 'Frutos rojos', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno proteico.jpg',
    name: 'Breakfast Burrito Proteico (32g Protein)',
    category: 'desayuno',
    description: 'Burrito de huevos revueltos con frijoles negros y maíz.',
    tags: ['desayuno', 'burrito', 'huevo', 'frijoles'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Huevo entero', quantity: 120, unit: 'g' },
      { name: 'Frijoles negros', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno proteico.jpg',
    name: 'Protein Overnight Oats (25g Protein)',
    category: 'desayuno',
    description: 'Avena reposada en tarro con proteína y frutos rojos.',
    tags: ['desayuno', 'avena', 'overnight-oats'],
    foods: [
      { name: 'Avena', quantity: 50, unit: 'g' },
      { name: 'Leche entera', quantity: 150, unit: 'ml' },
      { name: 'Frutos rojos', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno proteico.jpg',
    name: 'Turkey Egg Muffin Sándwich (30g Protein)',
    category: 'desayuno',
    description: 'Muffin de trigo con huevo, pechuga de pavo y queso.',
    tags: ['desayuno', 'muffin', 'pavo', 'huevo'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Pechuga de pavo', quantity: 40, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' },
      { name: 'Queso Mozzarella', quantity: 20, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno proteico.jpg',
    name: 'Cottage Cheese Bowl con Frutas (28g Protein)',
    category: 'desayuno',
    description: 'Queso cottage con arándanos, fresas picadas y granola.',
    tags: ['desayuno', 'cottage', 'frutas', 'granola'],
    foods: [
      { name: 'Queso cottage', quantity: 180, unit: 'g' },
      { name: 'Fresas', quantity: 40, unit: 'g' },
      { name: 'Arándanos', quantity: 30, unit: 'g' },
      { name: 'Granola', quantity: 20, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno proteico.jpg',
    name: 'Avocado Egg Toast Duo (22g Protein)',
    category: 'desayuno',
    description: 'Dos tostadas integrales con aguacate pisado y huevo duro en rodajas.',
    tags: ['desayuno', 'tostada', 'aguacate', 'huevo'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Aguacate', quantity: 50, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno proteico.jpg',
    name: 'Veggie Egg Scramble (22g Protein)',
    category: 'desayuno',
    description: 'Revuelto de huevos con espinaca y tomate picado.',
    tags: ['desayuno', 'huevo', 'espinaca', 'tomate'],
    foods: [
      { name: 'Huevo entero', quantity: 120, unit: 'g' },
      { name: 'Espinaca', quantity: 40, unit: 'g' },
      { name: 'Tomate cherry', quantity: 30, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno proteico.jpg',
    name: 'Peanut Butter Banana Toast Duo (24g Protein)',
    category: 'desayuno',
    description: 'Dos tostadas integrales con mantequilla de maní y plátano.',
    tags: ['desayuno', 'tostada', 'mani', 'platano'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Mantequilla de maní', quantity: 30, unit: 'g' },
      { name: 'Plátano', quantity: 60, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno proteico.jpg',
    name: 'Protein Smoothie Bowl con Banano y Berries (30g Protein)',
    category: 'desayuno',
    description: 'Bowl espeso de smoothie con banana en rodajas, berries y chía.',
    tags: ['desayuno', 'smoothie', 'bowl', 'proteina'],
    foods: [
      { name: 'Yogur griego', quantity: 150, unit: 'g' },
      { name: 'Plátano', quantity: 50, unit: 'g' },
      { name: 'Fresas', quantity: 40, unit: 'g' },
      { name: 'Granola', quantity: 20, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno proteico.jpg',
    name: 'Greek Yogurt & Honey Granola Bowl (26g Protein)',
    category: 'desayuno',
    description: 'Yogur griego cremoso con miel pura, arándanos y granola.',
    tags: ['desayuno', 'yogur-griego', 'miel', 'granola'],
    foods: [
      { name: 'Yogur griego', quantity: 180, unit: 'g' },
      { name: 'Granola', quantity: 30, unit: 'g' },
      { name: 'Arándanos', quantity: 30, unit: 'g' },
      { name: 'Miel', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno proteico.jpg',
    name: 'Protein Pancakes de Banano (32g Protein)',
    category: 'desayuno',
    description: 'Pancakes proteicos dorados con banana en rodajas.',
    tags: ['desayuno', 'pancakes', 'banana', 'proteico'],
    foods: [
      { name: 'Avena', quantity: 40, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Banano', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno proteico.jpg',
    name: 'Egg White Veggie Muffins (20g Protein)',
    category: 'desayuno',
    description: 'Muffins horneados de claras de huevo con espinaca y tomate.',
    tags: ['desayuno', 'muffins', 'huevo', 'espinaca'],
    foods: [
      { name: 'Huevo entero', quantity: 120, unit: 'g' },
      { name: 'Espinaca', quantity: 40, unit: 'g' },
      { name: 'Tomate cherry', quantity: 30, unit: 'g' }
    ]
  },

  // 14. desayuno semanal.jpg (6 Desayunos Completos)
  {
    imageFile: 'desayuno semanal.jpg',
    name: 'Desayuno Lunes: Tostada Aguacate, Huevos y Frutas',
    category: 'desayuno',
    description: 'Tostada con aguacate pisado, huevos cocidos, fresas, mango y tomate.',
    tags: ['desayuno', 'semanal', 'lunes', 'aguacate'],
    foods: [
      { name: 'Pan integral', quantity: 40, unit: 'g' },
      { name: 'Aguacate', quantity: 30, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Frutas variadas', quantity: 80, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno semanal.jpg',
    name: 'Desayuno Martes: Tostada Maní-Banana y Huevos Revueltos',
    category: 'desayuno',
    description: 'Tostada con mantequilla de maní, banana y arándanos, servida con huevos revueltos.',
    tags: ['desayuno', 'semanal', 'martes', 'mani'],
    foods: [
      { name: 'Pan integral', quantity: 40, unit: 'g' },
      { name: 'Mantequilla de maní', quantity: 20, unit: 'g' },
      { name: 'Banano', quantity: 50, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno semanal.jpg',
    name: 'Desayuno Miércoles: Omelette de Queso y Tostada de Banana',
    category: 'desayuno',
    description: 'Omelette doblado con queso y tomate, acompañado de tostadas con banana.',
    tags: ['desayuno', 'semanal', 'miercoles', 'omelette'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Queso Mozzarella', quantity: 30, unit: 'g' },
      { name: 'Pan integral', quantity: 40, unit: 'g' },
      { name: 'Banano', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno semanal.jpg',
    name: 'Desayuno Jueves: Huevos a la Plancha, Tostada Aguacate y Frutas',
    category: 'desayuno',
    description: 'Dos huevos fritos/a la plancha con tostada de aguacate, fresas, arándanos y mango.',
    tags: ['desayuno', 'semanal', 'jueves', 'huevos'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Pan integral', quantity: 30, unit: 'g' },
      { name: 'Aguacate', quantity: 30, unit: 'g' },
      { name: 'Frutas variadas', quantity: 80, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno semanal.jpg',
    name: 'Desayuno Viernes: Tostadas Francesas de Banana con Yogur y Papaya',
    category: 'desayuno',
    description: 'Tostadas francesas con canela y banana, servidas con yogur natural y papaya.',
    tags: ['desayuno', 'semanal', 'viernes', 'tostadas-francesas'],
    foods: [
      { name: 'Pan integral', quantity: 50, unit: 'g' },
      { name: 'Banano', quantity: 60, unit: 'g' },
      { name: 'Yogur natural', quantity: 60, unit: 'g' },
      { name: 'Papaya', quantity: 80, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno semanal.jpg',
    name: 'Desayuno Sábado: Tortilla de Aguacate y Tostadas con Banana',
    category: 'desayuno',
    description: 'Omelette doblado con aguacate y dos tostadas integrales con banana.',
    tags: ['desayuno', 'semanal', 'sabado', 'omelette'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Aguacate', quantity: 30, unit: 'g' },
      { name: 'Pan integral', quantity: 50, unit: 'g' },
      { name: 'Banano', quantity: 60, unit: 'g' }
    ]
  },

  // 15. desayuno semanal2.jpg (6 Desayunos Variados)
  {
    imageFile: 'desayuno semanal2.jpg',
    name: 'Desayuno Lunes: Huevo Frito, Omelette Jamón y Panecillo',
    category: 'desayuno',
    description: 'Huevo frito con omelette de jamón, rodajas de pepino y pan integral.',
    tags: ['desayuno', 'lunes', 'huevo', 'jamon'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Pechuga de pavo', quantity: 30, unit: 'g' },
      { name: 'Pan integral', quantity: 40, unit: 'g' },
      { name: 'Pepino', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno semanal2.jpg',
    name: 'Desayuno Martes: Sándwich Abierto de Jamón y Queso con Huevo',
    category: 'desayuno',
    description: 'Tostada con jamón, queso, huevos cocidos mollet y tomate cherry.',
    tags: ['desayuno', 'martes', 'sandwich', 'queso'],
    foods: [
      { name: 'Pan integral', quantity: 40, unit: 'g' },
      { name: 'Pechuga de pavo', quantity: 30, unit: 'g' },
      { name: 'Queso Mozzarella', quantity: 30, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Tomate cherry', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno semanal2.jpg',
    name: 'Desayuno Miércoles: Tostadas de Aguacate con Huevos Mollet y Queso',
    category: 'desayuno',
    description: 'Dos tostadas de aguacate pisado con huevos duros y queso.',
    tags: ['desayuno', 'miercoles', 'aguacate', 'huevo'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Aguacate', quantity: 50, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Queso Mozzarella', quantity: 30, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno semanal2.jpg',
    name: 'Desayuno Jueves: Omelette con Jamón Picado y Tostadas',
    category: 'desayuno',
    description: 'Omelette con jamón picado, tostadas de pan integral, pepino y tomate cherry.',
    tags: ['desayuno', 'jueves', 'omelette', 'jamon'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Pechuga de pavo', quantity: 30, unit: 'g' },
      { name: 'Pan integral', quantity: 40, unit: 'g' },
      { name: 'Tomate cherry', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno semanal2.jpg',
    name: 'Desayuno Viernes: Tostada de Salmón Ahumado y Aguacate',
    category: 'desayuno',
    description: 'Tostada con salmón ahumado y palta, otra tostada con queso, huevos sancochados y tomate.',
    tags: ['desayuno', 'viernes', 'salmon', 'aguacate'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Salmón ahumado', quantity: 40, unit: 'g' },
      { name: 'Aguacate', quantity: 30, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno semanal2.jpg',
    name: 'Desayuno Sábado: Tostada Aguacate, Salmón y Huevos Revueltos',
    category: 'desayuno',
    description: 'Tostada de aguacate con láminas de salmón ahumado, huevos revueltos y tomate cherry.',
    tags: ['desayuno', 'sabado', 'salmon', 'huevo-revuelto'],
    foods: [
      { name: 'Pan integral', quantity: 40, unit: 'g' },
      { name: 'Aguacate', quantity: 40, unit: 'g' },
      { name: 'Salmón ahumado', quantity: 50, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' }
    ]
  },

  // 16. desayuno yogurt.jpg (6 Yogurt Bowls)
  {
    imageFile: 'desayuno yogurt.jpg',
    name: 'Yogurt Bowl 1: Fresas, Arándanos y Almendras (340 kcal)',
    category: 'desayuno',
    description: 'Yogur griego cremoso con fresas frescas, arándanos y almendras fileteadas.',
    tags: ['desayuno', 'yogurt-bowl', 'fresa', 'almendras'],
    foods: [
      { name: 'Yogur griego', quantity: 180, unit: 'g' },
      { name: 'Fresas', quantity: 50, unit: 'g' },
      { name: 'Arándanos', quantity: 30, unit: 'g' },
      { name: 'Almendras', quantity: 15, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno yogurt.jpg',
    name: 'Yogurt Bowl 2: Mango, Frambuesas y Granola (395 kcal)',
    category: 'desayuno',
    description: 'Yogur griego con mango picado, frambuesas/frutos rojos y granola crujiente.',
    tags: ['desayuno', 'yogurt-bowl', 'mango', 'granola'],
    foods: [
      { name: 'Yogur griego', quantity: 180, unit: 'g' },
      { name: 'Mango', quantity: 60, unit: 'g' },
      { name: 'Frutos rojos', quantity: 30, unit: 'g' },
      { name: 'Granola', quantity: 25, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno yogurt.jpg',
    name: 'Yogurt Bowl 3: Kiwi, Arándanos y Semillas (310 kcal)',
    category: 'desayuno',
    description: 'Yogur griego con kiwi en rodajas, arándanos y semillas de chía o calabaza.',
    tags: ['desayuno', 'yogurt-bowl', 'kiwi', 'arandanos'],
    foods: [
      { name: 'Yogur griego', quantity: 180, unit: 'g' },
      { name: 'Frutas variadas', quantity: 50, unit: 'g' },
      { name: 'Arándanos', quantity: 30, unit: 'g' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno yogurt.jpg',
    name: 'Yogurt Bowl 4: Banana, Frambuesas y Almendras (370 kcal)',
    category: 'desayuno',
    description: 'Yogur griego con banana en rodajas, frambuesas y almendras picadas.',
    tags: ['desayuno', 'yogurt-bowl', 'banana', 'almendras'],
    foods: [
      { name: 'Yogur griego', quantity: 180, unit: 'g' },
      { name: 'Banano', quantity: 60, unit: 'g' },
      { name: 'Frutos rojos', quantity: 30, unit: 'g' },
      { name: 'Almendras', quantity: 15, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno yogurt.jpg',
    name: 'Yogurt Bowl 5: Fresas, Frambuesas y Nueces (330 kcal)',
    category: 'desayuno',
    description: 'Yogur griego con mix de bayas frescas, semillas de chía y nueces.',
    tags: ['desayuno', 'yogurt-bowl', 'berries', 'nueces'],
    foods: [
      { name: 'Yogur griego', quantity: 180, unit: 'g' },
      { name: 'Fresas', quantity: 40, unit: 'g' },
      { name: 'Frutos rojos', quantity: 30, unit: 'g' },
      { name: 'Nueces', quantity: 15, unit: 'g' }
    ]
  },
  {
    imageFile: 'desayuno yogurt.jpg',
    name: 'Yogurt Bowl 6: Kiwi, Fresas y Mango (420 kcal)',
    category: 'desayuno',
    description: 'Yogur griego cargado de kiwi, fresas picadas, mango y granola.',
    tags: ['desayuno', 'yogurt-bowl', 'kiwi', 'fresa', 'mango'],
    foods: [
      { name: 'Yogur griego', quantity: 200, unit: 'g' },
      { name: 'Mango', quantity: 50, unit: 'g' },
      { name: 'Fresas', quantity: 40, unit: 'g' },
      { name: 'Granola', quantity: 25, unit: 'g' }
    ]
  },

  // 17. ensalada proteica.jpg (4 Ensaladas Proteicas)
  {
    imageFile: 'ensalada proteica.jpg',
    name: 'Ensalada Proteica Clásica (Pollo, Lentejas y Espinacas)',
    category: 'almuerzo',
    description: 'Pollo a la plancha con lentejas cocidas, espinacas, tomate cherry y aguacate.',
    tags: ['almuerzo', 'ensalada', 'pollo', 'lentejas'],
    foods: [
      { name: 'Pollo pechuga', quantity: 140, unit: 'g' },
      { name: 'Lentejas cocidas', quantity: 80, unit: 'g' },
      { name: 'Espinaca', quantity: 50, unit: 'g' },
      { name: 'Aguacate', quantity: 30, unit: 'g' }
    ]
  },
  {
    imageFile: 'ensalada proteica.jpg',
    name: 'Ensalada Mediterránea de Atún, Garbanzos y Huevo',
    category: 'almuerzo',
    description: 'Atún desmenuzado con garbanzos, huevo duro, pepino y zanahoria rallada.',
    tags: ['almuerzo', 'ensalada', 'atun', 'garbanzos'],
    foods: [
      { name: 'Atún en agua', quantity: 100, unit: 'g' },
      { name: 'Garbanzos', quantity: 80, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' },
      { name: 'Pepino', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'ensalada proteica.jpg',
    name: 'Ensalada Nórdica de Salmón, Quinoa y Aguacate',
    category: 'almuerzo',
    description: 'Salmón a la plancha con quinoa cocida, palta, espinacas y limón.',
    tags: ['almuerzo', 'ensalada', 'salmon', 'quinoa'],
    foods: [
      { name: 'Salmón', quantity: 140, unit: 'g' },
      { name: 'Quinoa cocida', quantity: 80, unit: 'g' },
      { name: 'Aguacate', quantity: 40, unit: 'g' },
      { name: 'Espinaca', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'ensalada proteica.jpg',
    name: 'Ensalada Energética de Huevo, Rúcula y Nueces',
    category: 'almuerzo',
    description: 'Huevos sancochados con hojas de rúcula/espinaca, zanahoria y nueces tostadas.',
    tags: ['almuerzo', 'ensalada', 'huevo', 'nueces'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Espinaca', quantity: 50, unit: 'g' },
      { name: 'Zanahoria', quantity: 40, unit: 'g' },
      { name: 'Nueces', quantity: 20, unit: 'g' }
    ]
  },

  // 18. f9899d6f01d8d157f815b3dd7b1cfb46.jpg (4 Desayunos Proteicos)
  {
    imageFile: 'f9899d6f01d8d157f815b3dd7b1cfb46.jpg',
    name: 'Avocado Toast con Huevo Duro',
    category: 'desayuno',
    description: 'Tostada de pan integral con palta y 1 huevo duro.',
    tags: ['desayuno', 'tostada', 'aguacate', 'huevo'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Aguacate', quantity: 50, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'f9899d6f01d8d157f815b3dd7b1cfb46.jpg',
    name: 'Berry Parfait con Yogur Griego y Granola',
    category: 'desayuno',
    description: 'Yogur griego con bayas/frutos rojos y granola crujiente.',
    tags: ['desayuno', 'parfait', 'yogur-griego', 'granola'],
    foods: [
      { name: 'Yogur griego', quantity: 200, unit: 'g' },
      { name: 'Frutos rojos', quantity: 50, unit: 'g' },
      { name: 'Granola', quantity: 30, unit: 'g' }
    ]
  },
  {
    imageFile: 'f9899d6f01d8d157f815b3dd7b1cfb46.jpg',
    name: 'Omelette Proteico con Espinacas y Tomate',
    category: 'desayuno',
    description: 'Omelette de 2 huevos con espinacas y tomates cherry.',
    tags: ['desayuno', 'omelette', 'huevo', 'espinaca'],
    foods: [
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Espinaca', quantity: 50, unit: 'g' },
      { name: 'Tomate cherry', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'f9899d6f01d8d157f815b3dd7b1cfb46.jpg',
    name: 'Salmon Bagel con Queso Crema',
    category: 'desayuno',
    description: 'Bagel con queso crema y salmón ahumado de alta proteína.',
    tags: ['desayuno', 'bagel', 'salmon', 'queso-crema'],
    foods: [
      { name: 'Bagel', quantity: 80, unit: 'g' },
      { name: 'Queso crema', quantity: 30, unit: 'g' },
      { name: 'Salmón ahumado', quantity: 50, unit: 'g' }
    ]
  },

  // 19. pankeis.jpg (4 Variedades de Pancakes Proteicos)
  {
    imageFile: 'pankeis.jpg',
    name: 'Pancakes Proteicos de Cacao Amargo y Banana',
    category: 'desayuno',
    description: 'Pancakes de avena, banana, huevo y cacao amargo.',
    tags: ['desayuno', 'pancakes', 'cacao', 'banana'],
    foods: [
      { name: 'Avena', quantity: 40, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' },
      { name: 'Banano', quantity: 60, unit: 'g' },
      { name: 'Cacao en polvo', quantity: 15, unit: 'g' }
    ]
  },
  {
    imageFile: 'pankeis.jpg',
    name: 'Pancakes Verdes Proteicos de Espinaca y Miel',
    category: 'desayuno',
    description: 'Pancakes nutracéuticos de espinaca, avena, chía remojada, yogur y miel.',
    tags: ['desayuno', 'pancakes', 'espinaca', 'chia'],
    foods: [
      { name: 'Avena', quantity: 40, unit: 'g' },
      { name: 'Espinaca', quantity: 30, unit: 'g' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' },
      { name: 'Yogur natural', quantity: 40, unit: 'g' },
      { name: 'Miel', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'pankeis.jpg',
    name: 'Pancakes Proteicos de Frutos Rojos y Harina de Almendras',
    category: 'desayuno',
    description: 'Pancakes de harina de almendras, huevo, frutos rojos y miel.',
    tags: ['desayuno', 'pancakes', 'almendras', 'berries'],
    foods: [
      { name: 'Harina de almendras', quantity: 40, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' },
      { name: 'Frutos rojos', quantity: 40, unit: 'g' },
      { name: 'Miel', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'pankeis.jpg',
    name: 'Pancakes Proteicos de Naranja y Puré de Manzana',
    category: 'desayuno',
    description: 'Pancakes de harina integral, puré de manzana, jugo de naranja y proteína en polvo.',
    tags: ['desayuno', 'pancakes', 'naranja', 'manzana'],
    foods: [
      { name: 'Pan integral', quantity: 40, unit: 'g' },
      { name: 'Manzana', quantity: 50, unit: 'g' },
      { name: 'Naranja', quantity: 40, unit: 'g' },
      { name: 'Miel', quantity: 10, unit: 'g' }
    ]
  },

  // 20. pollo brocoli papa arroz.jpg (1 Plato Clásico Fitness)
  {
    imageFile: 'pollo brocoli papa arroz.jpg',
    name: 'Plato Clásico Fitness: Pollo, Brócoli, Papas y Arroz',
    category: 'almuerzo',
    description: 'Pechuga de pollo sazonada a la plancha, papas doradas al horno, brócoli al vapor y arroz blanco.',
    tags: ['almuerzo', 'fitness', 'pollo', 'papa', 'arroz'],
    foods: [
      { name: 'Pollo pechuga', quantity: 160, unit: 'g' },
      { name: 'Papas baby', quantity: 120, unit: 'g' },
      { name: 'Brócoli', quantity: 100, unit: 'g' },
      { name: 'Arroz blanco', quantity: 120, unit: 'g' }
    ]
  },

  // 21. recetas avenas 1.jpg (3 Avenas)
  {
    imageFile: 'recetas avenas 1.jpg',
    name: 'Avena Trasnochada de Banano y Mantequilla de Maní',
    category: 'desayuno',
    description: 'Avena reposada en leche con banano triturado y mantequilla de maní.',
    tags: ['desayuno', 'avena', 'overnight-oats', 'mani'],
    foods: [
      { name: 'Avena', quantity: 50, unit: 'g' },
      { name: 'Leche entera', quantity: 200, unit: 'ml' },
      { name: 'Banano', quantity: 100, unit: 'g' },
      { name: 'Mantequilla de maní', quantity: 20, unit: 'g' },
      { name: 'Miel', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'recetas avenas 1.jpg',
    name: 'Avena Trasnochada de Fresa y Yogur',
    category: 'desayuno',
    description: 'Avena con leche, yogur natural, fresas picadas y miel.',
    tags: ['desayuno', 'avena', 'fresa', 'yogur'],
    foods: [
      { name: 'Avena', quantity: 50, unit: 'g' },
      { name: 'Leche entera', quantity: 150, unit: 'ml' },
      { name: 'Yogur natural', quantity: 100, unit: 'g' },
      { name: 'Fresas', quantity: 60, unit: 'g' },
      { name: 'Miel', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'recetas avenas 1.jpg',
    name: 'Avena Trasnochada de Cacao y Chía',
    category: 'desayuno',
    description: 'Avena con cacao en polvo, semillas de chía, leche y miel.',
    tags: ['desayuno', 'avena', 'cacao', 'chia'],
    foods: [
      { name: 'Avena', quantity: 50, unit: 'g' },
      { name: 'Leche entera', quantity: 200, unit: 'ml' },
      { name: 'Cacao en polvo', quantity: 15, unit: 'g' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' },
      { name: 'Miel', quantity: 10, unit: 'g' }
    ]
  },

  // 22. recetas avenas 2.jpg (8 Overnight Oats)
  {
    imageFile: 'recetas avenas 2.jpg',
    name: 'Overnight Oats - Strawberry Cheesecake',
    category: 'desayuno',
    description: 'Avena con leche, fresas, queso crema y chía.',
    tags: ['desayuno', 'avena', 'fresa', 'cheesecake'],
    foods: [
      { name: 'Avena', quantity: 50, unit: 'g' },
      { name: 'Leche entera', quantity: 180, unit: 'ml' },
      { name: 'Fresas', quantity: 50, unit: 'g' },
      { name: 'Queso crema', quantity: 25, unit: 'g' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'recetas avenas 2.jpg',
    name: 'Overnight Oats - Apple Cinnamon',
    category: 'desayuno',
    description: 'Avena con leche, manzana picada, miel y semillas de chía.',
    tags: ['desayuno', 'avena', 'manzana', 'canela'],
    foods: [
      { name: 'Avena', quantity: 50, unit: 'g' },
      { name: 'Leche entera', quantity: 180, unit: 'ml' },
      { name: 'Manzana', quantity: 60, unit: 'g' },
      { name: 'Miel', quantity: 10, unit: 'g' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'recetas avenas 2.jpg',
    name: 'Overnight Oats - Peanut Butter Banana',
    category: 'desayuno',
    description: 'Avena con mantequilla de maní, banana, leche y chía.',
    tags: ['desayuno', 'avena', 'banana', 'mani'],
    foods: [
      { name: 'Avena', quantity: 50, unit: 'g' },
      { name: 'Leche entera', quantity: 180, unit: 'ml' },
      { name: 'Mantequilla de maní', quantity: 20, unit: 'g' },
      { name: 'Banano', quantity: 60, unit: 'g' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'recetas avenas 2.jpg',
    name: 'Overnight Oats - Banana Nut',
    category: 'desayuno',
    description: 'Avena con leche, banana en rodajas, nueces picadas y chía.',
    tags: ['desayuno', 'avena', 'banana', 'nueces'],
    foods: [
      { name: 'Avena', quantity: 50, unit: 'g' },
      { name: 'Leche entera', quantity: 180, unit: 'ml' },
      { name: 'Banano', quantity: 60, unit: 'g' },
      { name: 'Nueces', quantity: 20, unit: 'g' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'recetas avenas 2.jpg',
    name: 'Overnight Oats - Blueberry Almond',
    category: 'desayuno',
    description: 'Avena con arándanos frescos, almendras laminadas y chía.',
    tags: ['desayuno', 'avena', 'arandanos', 'almendras'],
    foods: [
      { name: 'Avena', quantity: 50, unit: 'g' },
      { name: 'Leche entera', quantity: 180, unit: 'ml' },
      { name: 'Arándanos', quantity: 50, unit: 'g' },
      { name: 'Almendras', quantity: 15, unit: 'g' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'recetas avenas 2.jpg',
    name: 'Overnight Oats - Mango Coconut',
    category: 'desayuno',
    description: 'Avena con mango en cubos, leche y chía.',
    tags: ['desayuno', 'avena', 'mango', 'tropical'],
    foods: [
      { name: 'Avena', quantity: 50, unit: 'g' },
      { name: 'Leche entera', quantity: 180, unit: 'ml' },
      { name: 'Mango', quantity: 60, unit: 'g' },
      { name: 'Semillas de chía', quantity: 10, unit: 'g' }
    ]
  },
  {
    imageFile: 'recetas avenas 2.jpg',
    name: 'Overnight Oats - Chocolate Peanut Butter',
    category: 'desayuno',
    description: 'Avena sabor chocolate con mantequilla de maní y cacao en polvo.',
    tags: ['desayuno', 'avena', 'chocolate', 'mani'],
    foods: [
      { name: 'Avena', quantity: 50, unit: 'g' },
      { name: 'Leche entera', quantity: 180, unit: 'ml' },
      { name: 'Mantequilla de maní', quantity: 20, unit: 'g' },
      { name: 'Cacao en polvo', quantity: 15, unit: 'g' }
    ]
  },
  {
    imageFile: 'recetas avenas 2.jpg',
    name: 'Overnight Oats - Mocha Coffee & Chocolate',
    category: 'desayuno',
    description: 'Avena con toques de café, cacao en polvo y leche.',
    tags: ['desayuno', 'avena', 'mocha', 'cafe'],
    foods: [
      { name: 'Avena', quantity: 50, unit: 'g' },
      { name: 'Leche entera', quantity: 180, unit: 'ml' },
      { name: 'Cacao en polvo', quantity: 15, unit: 'g' },
      { name: 'Miel', quantity: 10, unit: 'g' }
    ]
  },

  // 23. sandwich.jpg (8 Sándwiches)
  {
    imageFile: 'sandwich.jpg',
    name: 'Sándwich de Queso Feta y Tomate',
    category: 'desayuno',
    description: 'Sándwich de pan integral con queso feta, tomate y ricas hierbas.',
    tags: ['sandwich', 'desayuno', 'feta', 'tomate'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Queso Feta', quantity: 40, unit: 'g' },
      { name: 'Tomate', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'sandwich.jpg',
    name: 'Sándwich de Hummus y Verduras a la Parrilla',
    category: 'almuerzo',
    description: 'Sándwich de hummus con vegetales asados a la parrilla.',
    tags: ['sandwich', 'almuerzo', 'hummus', 'vegetales'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Hummus', quantity: 40, unit: 'g' },
      { name: 'Verduras mixtas', quantity: 60, unit: 'g' }
    ]
  },
  {
    imageFile: 'sandwich.jpg',
    name: 'Sándwich de Queso Cottage y Pepino',
    category: 'cena',
    description: 'Sándwich refrescante de queso cottage con pepino en rodajas y eneldo.',
    tags: ['sandwich', 'cena', 'cottage', 'pepino'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Queso cottage', quantity: 60, unit: 'g' },
      { name: 'Pepino', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'sandwich.jpg',
    name: 'Sándwich de Aguacate y Huevo Pochado',
    category: 'desayuno',
    description: 'Tostada/Sándwich de aguacate pisado con huevo pochado.',
    tags: ['sandwich', 'desayuno', 'aguacate', 'huevo'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Aguacate', quantity: 40, unit: 'g' },
      { name: 'Huevo entero', quantity: 50, unit: 'g' }
    ]
  },
  {
    imageFile: 'sandwich.jpg',
    name: 'Sándwich de Yogurt Griego y Frutos del Bosque',
    category: 'desayuno',
    description: 'Sándwich dulce de yogur griego con berries frescas.',
    tags: ['sandwich', 'desayuno', 'yogur', 'frutos-rojos'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Yogur griego', quantity: 60, unit: 'g' },
      { name: 'Frutos rojos', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'sandwich.jpg',
    name: 'Sándwich de Mozzarella, Pesto y Tomate Cherry',
    category: 'almuerzo',
    description: 'Sándwich caprese de mozzarella, pesto casero y tomates cherry.',
    tags: ['sandwich', 'almuerzo', 'mozzarella', 'pesto'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Queso Mozzarella', quantity: 50, unit: 'g' },
      { name: 'Pesto', quantity: 15, unit: 'g' },
      { name: 'Tomate cherry', quantity: 40, unit: 'g' }
    ]
  },
  {
    imageFile: 'sandwich.jpg',
    name: 'Sándwich de Pechuga de Pavo y Espinaca',
    category: 'almuerzo',
    description: 'Pechuga de pavo con hojas frescas de espinaca y mostaza.',
    tags: ['sandwich', 'almuerzo', 'pavo', 'espinaca'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Pechuga de pavo', quantity: 80, unit: 'g' },
      { name: 'Espinaca', quantity: 30, unit: 'g' }
    ]
  },
  {
    imageFile: 'sandwich.jpg',
    name: 'Sándwich de Ensalada de Huevo y Aguacate',
    category: 'almuerzo',
    description: 'Sándwich cremoso de huevos duros picados con aguacate y lechuga.',
    tags: ['sandwich', 'almuerzo', 'huevo', 'aguacate'],
    foods: [
      { name: 'Pan integral', quantity: 60, unit: 'g' },
      { name: 'Huevo entero', quantity: 100, unit: 'g' },
      { name: 'Aguacate', quantity: 40, unit: 'g' },
      { name: 'Lechuga', quantity: 20, unit: 'g' }
    ]
  }
];

function buildRichDescription(menu) {
  const baseDesc = menu.description || '';
  if (baseDesc.includes('Preparación:')) return baseDesc;

  const nameLower = menu.name.toLowerCase();
  const fileLower = (menu.imageFile || '').toLowerCase();
  let prepSteps = [];

  if (fileLower === 'air frier.jpg' || (menu.tags && menu.tags.includes('air-fryer'))) {
    prepSteps = [
      '1. Precalentar la freidora de aire a 180°C - 200°C.',
      '2. Sazonar los ingredientes con especias a gusto y una pizca de aceite de oliva.',
      '3. Cocinar en la canasta durante 12-15 minutos, agitando a la mitad de la cocción.',
      '4. Servir de inmediato bien crocante y jugoso.'
    ];
  } else if (fileLower.includes('avenas') || nameLower.includes('overnight') || nameLower.includes('avena trasnochada')) {
    prepSteps = [
      '1. En un recipiente o frasco hermético, colocar la avena junto con la leche o yogur.',
      '2. Agregar las semillas de chía o cacao y revolver enérgicamente.',
      '3. Tapar y refrigerar durante al menos 6 horas (o toda la noche).',
      '4. Antes de consumir, agregar la fruta fresca picada y los frutos secos arriba.'
    ];
  } else if (nameLower.includes('sándwich') || nameLower.includes('sandwich') || nameLower.includes('tostada') || nameLower.includes('bagel') || nameLower.includes('burrito')) {
    prepSteps = [
      '1. Tostar las rebanadas de pan integral hasta lograr una textura crocante.',
      '2. Preparar el relleno (cocinar huevos a la plancha/pochados o cortar proteínas y vegetales).',
      '3. Untar salsas saludables (hummus, guacamole, pesto o queso crema) sobre el pan.',
      '4. Armar el sándwich ensamblando las capas y servir tibio.'
    ];
  } else if (nameLower.includes('batido') || nameLower.includes('smoothie')) {
    prepSteps = [
      '1. Colocar todos los ingredientes (frutas, leche/yogur y semillas) en el vaso de la licuadora.',
      '2. Licuar a velocidad alta durante 60 segundos hasta obtener una textura homogénea y cremosa.',
      '3. Servir en un vaso alto con hielo al gusto.'
    ];
  } else if (nameLower.includes('pancake') || nameLower.includes('panqueque')) {
    prepSteps = [
      '1. Licuar o procesar la mezcla (avena, huevo, banana/proteína) hasta tener una masa fluida.',
      '2. Calentar una sartén antiadherente a fuego medio con un toque de aceite.',
      '3. Verter porciones de masa y cocinar 2 minutos por lado hasta que doren.',
      '4. Servir apilados acompañados de frutas picadas y miel.'
    ];
  } else if (nameLower.includes('ensalada') || nameLower.includes('salad')) {
    prepSteps = [
      '1. Lavar y desinfectar cuidadosamente las hojas verdes y hortalizas frescas.',
      '2. Cortar los vegetales en cubos o tiras e integrar con la proteína (pollo, atún, salmón o granos).',
      '3. Aderezar con aceite de oliva virgen extra, limón, sal y pimienta justo antes de consumir.'
    ];
  } else {
    prepSteps = [
      '1. Cocinar las proteínas a la plancha, al horno o al vapor con sazón natural.',
      '2. Preparar la guarnición (arroz, quinoa, camote o papas) sancochándolas u horneándolas.',
      '3. Blanquear o saltear los vegetales verdes al vapor durante 5 minutos para mantener nutrientes.',
      '4. Montar el plato o bowl distribuyendo los ingredientes de forma armónica.'
    ];
  }

  return `${baseDesc}\n\n👩‍🍳 Preparación:\n${prepSteps.join('\n')}`;
}

const enrichedMenus = granularMenus.map(m => ({
  ...m,
  description: buildRichDescription(m)
}));

const outputPath = path.join(__dirname, 'seed-data', 'menus-extracted.json');
fs.writeFileSync(outputPath, JSON.stringify(enrichedMenus, null, 2), 'utf8');
console.log(`✨ Generados ${enrichedMenus.length} menús enriquecidos con preparación en ${outputPath}`);

