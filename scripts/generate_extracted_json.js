import fs from 'fs';
import path from 'path';

const menusData = [
  {
    imageFile: "06cea6e78adbcada3458f8f86d748b4a.jpg",
    name: "Opciones de Sándwiches Saludables",
    category: "desayuno",
    description: "Combinaciones de sándwiches con pan integral, huevo, atún, pollo, espinaca, queso mozzarella y humus.",
    tags: ["sandwich", "desayuno", "proteico", "facil"],
    foods: [
      { name: "Pan integral", quantity: 60, unit: "gramos", estimatedKcal: 150 },
      { name: "Huevo entero", quantity: 100, unit: "gramos", estimatedKcal: 155 },
      { name: "Atún en agua", quantity: 100, unit: "gramos", estimatedKcal: 116 },
      { name: "Pollo pechuga", quantity: 100, unit: "gramos", estimatedKcal: 165 },
      { name: "Lechuga", quantity: 30, unit: "gramos", estimatedKcal: 5 },
      { name: "Aguacate", quantity: 50, unit: "gramos", estimatedKcal: 80 },
      { name: "Espinaca", quantity: 30, unit: "gramos", estimatedKcal: 7 },
      { name: "Queso Mozzarella", quantity: 30, unit: "gramos", estimatedKcal: 85 },
      { name: "Tomate", quantity: 50, unit: "gramos", estimatedKcal: 9 },
      { name: "Hummus", quantity: 30, unit: "gramos", estimatedKcal: 50 }
    ]
  },
  {
    imageFile: "4d2941a48a7d1f814a8f34204754da9f.jpg",
    name: "Bowls y Viandas de Almuerzo para el Trabajo",
    category: "almuerzo",
    description: "Combinaciones balanceadas de pollo, carne, arroz, trigo sarraceno, pasta y vegetales para meal prep.",
    tags: ["meal-prep", "almuerzo", "proteico", "oficina"],
    foods: [
      { name: "Pollo pechuga", quantity: 150, unit: "gramos", estimatedKcal: 247.5 },
      { name: "Carne de res magra", quantity: 150, unit: "gramos", estimatedKcal: 225 },
      { name: "Arroz blanco", quantity: 150, unit: "gramos", estimatedKcal: 195 },
      { name: "Trigo sarraceno", quantity: 120, unit: "gramos", estimatedKcal: 180 },
      { name: "Pasta cocida", quantity: 150, unit: "gramos", estimatedKcal: 196 },
      { name: "Pepino", quantity: 80, unit: "gramos", estimatedKcal: 12 },
      { name: "Brócoli", quantity: 100, unit: "gramos", estimatedKcal: 34 },
      { name: "Papa", quantity: 150, unit: "gramos", estimatedKcal: 115.5 }
    ]
  },
  {
    imageFile: "65ec7afdfb806d2de93c20ba54c944d7.jpg",
    name: "Plato Balanceado Nutritivo",
    category: "almuerzo",
    description: "Menú saludable con proteína magra, vegetación fresca y carbohidratos complejos.",
    tags: ["almuerzo", "saludable", "balanceado"],
    foods: [
      { name: "Pollo pechuga", quantity: 150, unit: "gramos", estimatedKcal: 247.5 },
      { name: "Arroz integral", quantity: 150, unit: "gramos", estimatedKcal: 166 },
      { name: "Ensalada mixta", quantity: 100, unit: "gramos", estimatedKcal: 20 },
      { name: "Aceite de oliva", quantity: 10, unit: "gramos", estimatedKcal: 88.4 }
    ]
  },
  {
    imageFile: "6f9f2786140b805dbbb44289cc89fdfc.jpg",
    name: "Ensaladas Saludables y Fáciles",
    category: "almuerzo",
    description: "Ensalada Mediterránea, Ensalada de Quinoa, Ensalada de Pollo y Caprese con pollo, atún y salmón.",
    tags: ["ensaladas", "almuerzo", "fresco", "bajo-en-calorias"],
    foods: [
      { name: "Pollo pechuga", quantity: 120, unit: "gramos", estimatedKcal: 198 },
      { name: "Atún en agua", quantity: 100, unit: "gramos", estimatedKcal: 116 },
      { name: "Camarones", quantity: 100, unit: "gramos", estimatedKcal: 99 },
      { name: "Quinoa cocida", quantity: 100, unit: "gramos", estimatedKcal: 120 },
      { name: "Garbanzos", quantity: 80, unit: "gramos", estimatedKcal: 131 },
      { name: "Lechuga", quantity: 80, unit: "gramos", estimatedKcal: 12 },
      { name: "Espinaca", quantity: 50, unit: "gramos", estimatedKcal: 11.5 },
      { name: "Tomate", quantity: 80, unit: "gramos", estimatedKcal: 14.4 },
      { name: "Queso Feta", quantity: 30, unit: "gramos", estimatedKcal: 79 },
      { name: "Aguacate", quantity: 50, unit: "gramos", estimatedKcal: 80 }
    ]
  },
  {
    imageFile: "air frier.jpg",
    name: "Guía Rápida de Cocción en Freidora de Aire",
    category: "general",
    description: "Tiempos y temperatura para pechuga de pollo, brócoli, camarones, papas baby y salmón en air fryer.",
    tags: ["air-fryer", "facil", "recetas", "rapido"],
    foods: [
      { name: "Pollo pechuga", quantity: 200, unit: "gramos", estimatedKcal: 330 },
      { name: "Brócoli", quantity: 150, unit: "gramos", estimatedKcal: 51 },
      { name: "Camarones", quantity: 150, unit: "gramos", estimatedKcal: 148.5 },
      { name: "Verduras mixtas", quantity: 150, unit: "gramos", estimatedKcal: 60 },
      { name: "Papas baby", quantity: 150, unit: "gramos", estimatedKcal: 115.5 },
      { name: "Salmón", quantity: 150, unit: "gramos", estimatedKcal: 312 },
      { name: "Huevo entero", quantity: 100, unit: "gramos", estimatedKcal: 155 }
    ]
  },
  {
    imageFile: "batidos para el desayuno.jpg",
    name: "Batidos Proteicos y Frutales para el Desayuno",
    category: "desayuno",
    description: "Batidos nutritivos de Plátano y Durazno, Fresa y Plátano, Mango y Piña, y Plátano con Café y Cacao.",
    tags: ["batidos", "desayuno", "smoothie", "frutas"],
    foods: [
      { name: "Yogur griego", quantity: 200, unit: "gramos", estimatedKcal: 118 },
      { name: "Plátano", quantity: 100, unit: "gramos", estimatedKcal: 89 },
      { name: "Durazno", quantity: 100, unit: "gramos", estimatedKcal: 39 },
      { name: "Fresa", quantity: 100, unit: "gramos", estimatedKcal: 32 },
      { name: "Mango", quantity: 100, unit: "gramos", estimatedKcal: 60 },
      { name: "Piña", quantity: 100, unit: "gramos", estimatedKcal: 50 },
      { name: "Leche entera", quantity: 200, unit: "ml", estimatedKcal: 122 },
      { name: "Miel", quantity: 15, unit: "gramos", estimatedKcal: 45 },
      { name: "Cacao en polvo", quantity: 10, unit: "gramos", estimatedKcal: 23 }
    ]
  },
  {
    imageFile: "cenas ligeras.jpg",
    name: "Cenas Ligeras en 20 Minutos",
    category: "cena",
    description: "Nordic Bowl, Wrap ligero y Ensalada express con salmón, pavo, garbanzos, lechuga y queso feta.",
    tags: ["cena", "ligero", "rapido", "saludable"],
    foods: [
      { name: "Salmón", quantity: 120, unit: "gramos", estimatedKcal: 249.6 },
      { name: "Pechuga de pavo", quantity: 100, unit: "gramos", estimatedKcal: 135 },
      { name: "Garbanzos", quantity: 100, unit: "gramos", estimatedKcal: 164 },
      { name: "Pepino", quantity: 80, unit: "gramos", estimatedKcal: 12 },
      { name: "Lechuga", quantity: 80, unit: "gramos", estimatedKcal: 12 },
      { name: "Tomate", quantity: 80, unit: "gramos", estimatedKcal: 14.4 },
      { name: "Aguacate", quantity: 50, unit: "gramos", estimatedKcal: 80 },
      { name: "Pan integral", quantity: 60, unit: "gramos", estimatedKcal: 150 },
      { name: "Queso Feta", quantity: 30, unit: "gramos", estimatedKcal: 79 }
    ]
  },
  {
    imageFile: "comidas variadas.jpg",
    name: "Plan de Almuerzos y Cenas para la Semana (7 Días)",
    category: "plan-semanal",
    description: "Meal prep semanal con Chicken Quinoa Bowl, Tuna Pasta Salad, Salmon con Espárragos y Turkey Meatballs.",
    tags: ["plan-semanal", "meal-prep", "almuerzo", "cena"],
    foods: [
      { name: "Pollo pechuga", quantity: 150, unit: "gramos", estimatedKcal: 247.5 },
      { name: "Carne de res magra", quantity: 150, unit: "gramos", estimatedKcal: 225 },
      { name: "Pavo molido", quantity: 150, unit: "gramos", estimatedKcal: 200 },
      { name: "Salmón", quantity: 150, unit: "gramos", estimatedKcal: 312 },
      { name: "Atún en agua", quantity: 120, unit: "gramos", estimatedKcal: 139.2 },
      { name: "Quinoa cocida", quantity: 120, unit: "gramos", estimatedKcal: 144 },
      { name: "Arroz integral", quantity: 150, unit: "gramos", estimatedKcal: 166 },
      { name: "Camote / Batata", quantity: 150, unit: "gramos", estimatedKcal: 129 },
      { name: "Brócoli", quantity: 100, unit: "gramos", estimatedKcal: 34 },
      { name: "Espárragos", quantity: 100, unit: "gramos", estimatedKcal: 20 },
      { name: "Frijoles negros", quantity: 80, unit: "gramos", estimatedKcal: 105 }
    ]
  },
  {
    imageFile: "comidas.jpg",
    name: "Bowls de Pollo para Meal Prep",
    category: "almuerzo",
    description: "6 opciones de bowls de pollo: Teriyaki, Garlic Butter, Lemon Herb, Burrito Bowl, BBQ y Spicy Noodle.",
    tags: ["meal-prep", "pollo", "bowls", "almuerzo"],
    foods: [
      { name: "Pollo pechuga", quantity: 150, unit: "gramos", estimatedKcal: 247.5 },
      { name: "Arroz blanco", quantity: 150, unit: "gramos", estimatedKcal: 195 },
      { name: "Quinoa cocida", quantity: 120, unit: "gramos", estimatedKcal: 144 },
      { name: "Brócoli", quantity: 100, unit: "gramos", estimatedKcal: 34 },
      { name: "Zanahoria", quantity: 50, unit: "gramos", estimatedKcal: 20 },
      { name: "Frijoles negros", quantity: 80, unit: "gramos", estimatedKcal: 105 },
      { name: "Maíz dulce", quantity: 50, unit: "gramos", estimatedKcal: 43 },
      { name: "Fideos", quantity: 100, unit: "gramos", estimatedKcal: 138 }
    ]
  },
  {
    imageFile: "da8710390b8e71cb0ea639a687624111.jpg",
    name: "Menú Saludable de Pechuga y Vegetales",
    category: "almuerzo",
    description: "Plato fitness de pechuga a la plancha con vegetales al vapor y acompañamiento ligero.",
    tags: ["almuerzo", "fitness", "saludable"],
    foods: [
      { name: "Pollo pechuga", quantity: 150, unit: "gramos", estimatedKcal: 247.5 },
      { name: "Brócoli", quantity: 100, unit: "gramos", estimatedKcal: 34 },
      { name: "Zanahoria", quantity: 80, unit: "gramos", estimatedKcal: 32 },
      { name: "Arroz blanco", quantity: 120, unit: "gramos", estimatedKcal: 156 }
    ]
  },
  {
    imageFile: "desayuno proteico.jpg",
    name: "Desayunos Altos en Proteína",
    category: "desayuno",
    description: "Ideas de desayunos proteicos como Chia pudding bowl, Turkey egg muffin, Veggie egg scramble y Cottage cheese bowl.",
    tags: ["desayuno", "alta-proteina", "fitness", "huevos"],
    foods: [
      { name: "Huevo entero", quantity: 120, unit: "gramos", estimatedKcal: 186 },
      { name: "Pechuga de pavo", quantity: 60, unit: "gramos", estimatedKcal: 81 },
      { name: "Queso cottage", quantity: 150, unit: "gramos", estimatedKcal: 147 },
      { name: "Semillas de chía", quantity: 20, unit: "gramos", estimatedKcal: 97 },
      { name: "Pan integral", quantity: 60, unit: "gramos", estimatedKcal: 150 },
      { name: "Aguacate", quantity: 50, unit: "gramos", estimatedKcal: 80 },
      { name: "Mantequilla de maní", quantity: 30, unit: "gramos", estimatedKcal: 176 },
      { name: "Plátano", quantity: 100, unit: "gramos", estimatedKcal: 89 },
      { name: "Avena", quantity: 50, unit: "gramos", estimatedKcal: 194 }
    ]
  },
  {
    imageFile: "desayuno semanal.jpg",
    name: "Guía de Desayunos para Toda la Semana",
    category: "plan-semanal",
    description: "Variedad de opciones balanceadas de desayuno de lunes a sábado para estructurar la semana.",
    tags: ["desayuno", "plan-semanal", "habitos"],
    foods: [
      { name: "Huevo entero", quantity: 100, unit: "gramos", estimatedKcal: 155 },
      { name: "Avena", quantity: 50, unit: "gramos", estimatedKcal: 194 },
      { name: "Yogur griego", quantity: 150, unit: "gramos", estimatedKcal: 88.5 },
      { name: "Frutas variadas", quantity: 100, unit: "gramos", estimatedKcal: 50 },
      { name: "Pan integral", quantity: 50, unit: "gramos", estimatedKcal: 125 }
    ]
  },
  {
    imageFile: "desayuno semanal2.jpg",
    name: "Menú Semanal de Desayunos Variados",
    category: "plan-semanal",
    description: "Planificación de desayunos de Lunes a Sábado enfocada en nutrición y energía.",
    tags: ["desayuno", "plan-semanal", "organizacion"],
    foods: [
      { name: "Avena", quantity: 50, unit: "gramos", estimatedKcal: 194 },
      { name: "Leche entera", quantity: 200, unit: "ml", estimatedKcal: 122 },
      { name: "Huevo entero", quantity: 100, unit: "gramos", estimatedKcal: 155 },
      { name: "Frutos secos", quantity: 30, unit: "gramos", estimatedKcal: 180 },
      { name: "Frutas variadas", quantity: 100, unit: "gramos", estimatedKcal: 50 }
    ]
  },
  {
    imageFile: "desayuno yogurt.jpg",
    name: "Yogurt Bowls Proteicos",
    category: "desayuno",
    description: "6 variaciones de bowls de yogurt con frutas, granola y semillas (310 a 420 kcal).",
    tags: ["yogurt", "desayuno", "bowls", "proteico"],
    foods: [
      { name: "Yogur griego", quantity: 200, unit: "gramos", estimatedKcal: 118 },
      { name: "Frutas variadas", quantity: 100, unit: "gramos", estimatedKcal: 50 },
      { name: "Granola", quantity: 30, unit: "gramos", estimatedKcal: 140 },
      { name: "Semillas de chía", quantity: 15, unit: "gramos", estimatedKcal: 73 },
      { name: "Miel", quantity: 10, unit: "gramos", estimatedKcal: 30 },
      { name: "Frutos secos", quantity: 20, unit: "gramos", estimatedKcal: 120 }
    ]
  },
  {
    imageFile: "ensalada proteica.jpg",
    name: "Ensaladas Completas de Proteína",
    category: "almuerzo",
    description: "Cuatro versiones de ensaladas altas en proteína: Pollo a la plancha, Atún, Salmón y Huevo con espinaca y legumbres.",
    tags: ["ensaladas", "proteico", "almuerzo", "saludable"],
    foods: [
      { name: "Pollo pechuga", quantity: 120, unit: "gramos", estimatedKcal: 198 },
      { name: "Atún en agua", quantity: 100, unit: "gramos", estimatedKcal: 116 },
      { name: "Salmón", quantity: 120, unit: "gramos", estimatedKcal: 249.6 },
      { name: "Huevo entero", quantity: 100, unit: "gramos", estimatedKcal: 155 },
      { name: "Espinaca", quantity: 50, unit: "gramos", estimatedKcal: 11.5 },
      { name: "Tomate cherry", quantity: 60, unit: "gramos", estimatedKcal: 10.8 },
      { name: "Pepino", quantity: 50, unit: "gramos", estimatedKcal: 7.5 },
      { name: "Lentejas cocidas", quantity: 80, unit: "gramos", estimatedKcal: 93 },
      { name: "Garbanzos", quantity: 80, unit: "gramos", estimatedKcal: 131 },
      { name: "Quinoa cocida", quantity: 80, unit: "gramos", estimatedKcal: 96 },
      { name: "Aguacate", quantity: 50, unit: "gramos", estimatedKcal: 80 },
      { name: "Nueces", quantity: 20, unit: "gramos", estimatedKcal: 130 }
    ]
  },
  {
    imageFile: "f9899d6f01d8d157f815b3dd7b1cfb46.jpg",
    name: "Opciones de Desayuno Proteico Completo",
    category: "desayuno",
    description: "Avocado Toast (20g P), Berry Parfait (25g P), Veggie Omelette (20g P) y Salmon Bagel (30g P).",
    tags: ["desayuno", "proteico", "avocado-toast", "omelette"],
    foods: [
      { name: "Pan integral", quantity: 50, unit: "gramos", estimatedKcal: 125 },
      { name: "Bagel", quantity: 80, unit: "gramos", estimatedKcal: 200 },
      { name: "Yogur griego", quantity: 200, unit: "gramos", estimatedKcal: 118 },
      { name: "Huevo entero", quantity: 120, unit: "gramos", estimatedKcal: 186 },
      { name: "Aguacate", quantity: 50, unit: "gramos", estimatedKcal: 80 },
      { name: "Salmón ahumado", quantity: 50, unit: "gramos", estimatedKcal: 108 },
      { name: "Frutos rojos", quantity: 80, unit: "gramos", estimatedKcal: 40 },
      { name: "Espinaca", quantity: 40, unit: "gramos", estimatedKcal: 9 },
      { name: "Queso crema", quantity: 20, unit: "gramos", estimatedKcal: 68 }
    ]
  },
  {
    imageFile: "pankeis.jpg",
    name: "Pancakes Proteicos Variados",
    category: "desayuno",
    description: "Recetas de pancakes saludables elaborados con huevo, banana, avena, cacao, espinaca y harina de almendras.",
    tags: ["pancakes", "desayuno", "fitness", "recetas"],
    foods: [
      { name: "Avena", quantity: 60, unit: "gramos", estimatedKcal: 232.8 },
      { name: "Huevo entero", quantity: 100, unit: "gramos", estimatedKcal: 155 },
      { name: "Banano", quantity: 100, unit: "gramos", estimatedKcal: 89 },
      { name: "Cacao amargo", quantity: 15, unit: "gramos", estimatedKcal: 34.5 },
      { name: "Harina de almendras", quantity: 30, unit: "gramos", estimatedKcal: 175 },
      { name: "Espinaca", quantity: 30, unit: "gramos", estimatedKcal: 7 },
      { name: "Frutos rojos", quantity: 50, unit: "gramos", estimatedKcal: 25 },
      { name: "Miel", quantity: 15, unit: "gramos", estimatedKcal: 45 }
    ]
  },
  {
    imageFile: "Plan 7 dias - saludable.jpg",
    name: "Plan Nutricional Completo de 7 Días",
    category: "plan-semanal",
    description: "Plan semanal estructurado con Agua con limón en ayunas, Desayuno, Almuerzo, Snack y Cena.",
    tags: ["plan-semanal", "detox", "saludable", "7-dias"],
    foods: [
      { name: "Avena", quantity: 50, unit: "gramos", estimatedKcal: 194 },
      { name: "Huevo entero", quantity: 100, unit: "gramos", estimatedKcal: 155 },
      { name: "Pollo pechuga", quantity: 150, unit: "gramos", estimatedKcal: 247.5 },
      { name: "Pescado blanco", quantity: 150, unit: "gramos", estimatedKcal: 144 },
      { name: "Salmón", quantity: 150, unit: "gramos", estimatedKcal: 312 },
      { name: "Pechuga de pavo", quantity: 150, unit: "gramos", estimatedKcal: 202.5 },
      { name: "Aguacate", quantity: 50, unit: "gramos", estimatedKcal: 80 },
      { name: "Quinoa cocida", quantity: 100, unit: "gramos", estimatedKcal: 120 },
      { name: "Camote / Batata", quantity: 120, unit: "gramos", estimatedKcal: 103.2 },
      { name: "Almendras", quantity: 30, unit: "gramos", estimatedKcal: 173 },
      { name: "Sopa de verduras", quantity: 250, unit: "gramos", estimatedKcal: 90 }
    ]
  },
  {
    imageFile: "pollo brocoli papa arroz.jpg",
    name: "Plato Clásico Fitness: Pollo, Brócoli, Papa y Arroz",
    category: "almuerzo",
    description: "Combinación limpia y tradicional para ganar masa muscular o mantenimiento fitness.",
    tags: ["fitness", "almuerzo", "pollo", "clasico"],
    foods: [
      { name: "Pollo pechuga", quantity: 150, unit: "gramos", estimatedKcal: 247.5 },
      { name: "Brócoli", quantity: 100, unit: "gramos", estimatedKcal: 34 },
      { name: "Papa", quantity: 150, unit: "gramos", estimatedKcal: 115.5 },
      { name: "Arroz blanco", quantity: 150, unit: "gramos", estimatedKcal: 195 }
    ]
  },
  {
    imageFile: "recetas avenas 1.jpg",
    name: "Avenas Trasnochadas (Overnight Oats) - 3 Recetas",
    category: "desayuno",
    description: "Avena de Banano y Mantequilla de Maní, Avena de Fresa y Yogur, y Avena de Cacao y Chía.",
    tags: ["overnight-oats", "avena", "desayuno", "facil"],
    foods: [
      { name: "Avena", quantity: 50, unit: "gramos", estimatedKcal: 194 },
      { name: "Leche entera", quantity: 200, unit: "ml", estimatedKcal: 122 },
      { name: "Banano", quantity: 100, unit: "gramos", estimatedKcal: 89 },
      { name: "Mantequilla de maní", quantity: 20, unit: "gramos", estimatedKcal: 117 },
      { name: "Yogur natural", quantity: 100, unit: "gramos", estimatedKcal: 61 },
      { name: "Fresas", quantity: 50, unit: "gramos", estimatedKcal: 16 },
      { name: "Cacao en polvo", quantity: 10, unit: "gramos", estimatedKcal: 23 },
      { name: "Semillas de chía", quantity: 15, unit: "gramos", estimatedKcal: 73 },
      { name: "Miel", quantity: 10, unit: "gramos", estimatedKcal: 30 }
    ]
  },
  {
    imageFile: "recetas avenas 2.jpg",
    name: "Overnight Oats - 8 Variaciones Saludables",
    category: "desayuno",
    description: "Strawberry Cheesecake, Apple Cinnamon, Peanut Butter Banana, Banana Nut, Blueberry Almond, Mango Coconut y Mocha.",
    tags: ["overnight-oats", "avena", "desayuno", "variedad"],
    foods: [
      { name: "Avena", quantity: 50, unit: "gramos", estimatedKcal: 194 },
      { name: "Leche entera", quantity: 200, unit: "ml", estimatedKcal: 122 },
      { name: "Fresas", quantity: 50, unit: "gramos", estimatedKcal: 16 },
      { name: "Manzana", quantity: 80, unit: "gramos", estimatedKcal: 41.6 },
      { name: "Banano", quantity: 100, unit: "gramos", estimatedKcal: 89 },
      { name: "Arándanos", quantity: 50, unit: "gramos", estimatedKcal: 28.5 },
      { name: "Mango", quantity: 80, unit: "gramos", estimatedKcal: 48 },
      { name: "Mantequilla de maní", quantity: 20, unit: "gramos", estimatedKcal: 117 },
      { name: "Queso crema", quantity: 20, unit: "gramos", estimatedKcal: 68 },
      { name: "Semillas de chía", quantity: 15, unit: "gramos", estimatedKcal: 73 },
      { name: "Nueces", quantity: 20, unit: "gramos", estimatedKcal: 130 },
      { name: "Almendras", quantity: 20, unit: "gramos", estimatedKcal: 115 }
    ]
  },
  {
    imageFile: "Menu saludable.jpg",
    name: "Plan Semanal de Menú Saludable (7 Días)",
    category: "plan-semanal",
    description: "Plan de 7 días con huevos, pollo a la plancha, pescado al vapor, verduras y sopas para cenas.",
    tags: ["plan-semanal", "saludable", "bienestar"],
    foods: [
      { name: "Huevo entero", quantity: 100, unit: "gramos", estimatedKcal: 155 },
      { name: "Pollo pechuga", quantity: 150, unit: "gramos", estimatedKcal: 247.5 },
      { name: "Carne de res magra", quantity: 150, unit: "gramos", estimatedKcal: 225 },
      { name: "Pescado blanco", quantity: 150, unit: "gramos", estimatedKcal: 144 },
      { name: "Salmón", quantity: 150, unit: "gramos", estimatedKcal: 312 },
      { name: "Pechuga de pavo", quantity: 150, unit: "gramos", estimatedKcal: 202.5 },
      { name: "Brócoli", quantity: 100, unit: "gramos", estimatedKcal: 34 },
      { name: "Quinoa cocida", quantity: 100, unit: "gramos", estimatedKcal: 120 },
      { name: "Yogur natural", quantity: 150, unit: "gramos", estimatedKcal: 91.5 },
      { name: "Naranja", quantity: 100, unit: "gramos", estimatedKcal: 47 },
      { name: "Papaya", quantity: 100, unit: "gramos", estimatedKcal: 43 }
    ]
  },
  {
    imageFile: "sandwich.jpg",
    name: "Guía para Armar Sándwiches Nutritivos",
    category: "snack",
    description: "Combinaciones de Sándwich de Queso Feta & Tomate, Hummus & Verduras, Cottage & Pepino, Aguacate & Huevo, Pavo & Rúcula.",
    tags: ["sandwich", "snack", "desayuno", "recetas"],
    foods: [
      { name: "Pan integral", quantity: 60, unit: "gramos", estimatedKcal: 150 },
      { name: "Queso Feta", quantity: 30, unit: "gramos", estimatedKcal: 79 },
      { name: "Hummus", quantity: 30, unit: "gramos", estimatedKcal: 50 },
      { name: "Queso cottage", quantity: 50, unit: "gramos", estimatedKcal: 49 },
      { name: "Huevo entero", quantity: 50, unit: "gramos", estimatedKcal: 77.5 },
      { name: "Pechuga de pavo", quantity: 50, unit: "gramos", estimatedKcal: 67.5 },
      { name: "Aguacate", quantity: 40, unit: "gramos", estimatedKcal: 64 },
      { name: "Tomate cherry", quantity: 50, unit: "gramos", estimatedKcal: 9 },
      { name: "Pepino", quantity: 40, unit: "gramos", estimatedKcal: 6 },
      { name: "Espinaca", quantity: 30, unit: "gramos", estimatedKcal: 7 },
      { name: "Pesto", quantity: 15, unit: "gramos", estimatedKcal: 65 }
    ]
  }
];

const outputPath = '/home/jsojo/Documentos/ECOSYSTEM/Nutringest/Nutringest_Arch/scripts/seed-data/menus-extracted.json';
fs.writeFileSync(outputPath, JSON.stringify(menusData, null, 2));
console.log(`Saved ${menusData.length} extracted menus to ${outputPath}`);
