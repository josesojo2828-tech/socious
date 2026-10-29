#!/bin/bash
# batch-process-lote1.sh — Procesa Lote 1 (6 PDFs prioritarios)
# Guarda resultados intermedios en scripts/seed-data/lote1/
# Uso: ./scripts/batch-process-lote1.sh

set -euo pipefail

PDF_DIR="/home/jsojo/Documentos/ECOSYSTEM/Nutringest/TOTALIDAD/PDF"
OUT_DIR="scripts/seed-data/lote1"
PARSER="scripts/pdf-recipe-parser.js"
MATCHER="scripts/food-matcher.js"

mkdir -p "$OUT_DIR"

# Lote 1: PDFs prioritarios
PDFS=(
  "Desayunos.pdf"
  "10_recetas_para_diabeticos.pdf"
  "Recetario_Paciente Renal.pdf"
  "Recetario-Alimentacion-Saludable-edicion-2018.pdf"
  "Recetas rápidas.pdf"
  "21-recetas-cetogenicas-1.pdf"
)

TOTAL=${#PDFS[@]}
COUNT=0
ALL_RECIPES="[]"

for pdf in "${PDFS[@]}"; do
  COUNT=$((COUNT + 1))
  BASENAME="${pdf%.pdf}"
  OUTFILE="$OUT_DIR/${BASENAME}.json"
  MATCHED_OUTFILE="$OUT_DIR/${BASENAME}-matched.json"
  LOGFILE="$OUT_DIR/${BASENAME}.log"

  echo ""
  echo "══════════════════════════════════════════════════"
  echo "  [$COUNT/$TOTAL] Procesando: $pdf"
  echo "══════════════════════════════════════════════════"

  if [ -f "$MATCHED_OUTFILE" ]; then
    echo "  ⏩ Ya existe $MATCHED_OUTFILE, saltando..."
    continue
  fi

  echo "  → Extrayendo recetas con LLM..."
  START=$(date +%s)

  # Fase 1: Extraer recetas del PDF
  if node "$PARSER" "$PDF_DIR/$pdf" 2>"$LOGFILE" > "$OUTFILE"; then
    END=$(date +%s)
    DURATION=$((END - START))
    
    RECIPE_COUNT=$(node -e "const r=require('./$OUTFILE'); console.log(Array.isArray(r)?r.length:0)")
    echo "  ✅ Extraídas $RECIPE_COUNT recetas en ${DURATION}s"
    
    if [ "$RECIPE_COUNT" -eq 0 ]; then
      echo "  ⚠️  Sin recetas, guardando log y continuando..."
      continue
    fi
    
    # Fase 2: Matchear ingredientes
    echo "  → Matcheando ingredientes contra DB..."
    node -e "
      const fs = require('fs');
      const recipes = JSON.parse(fs.readFileSync('$OUTFILE','utf8'));
      console.log(JSON.stringify(recipes));
    " | node "$MATCHER" 2>> "$LOGFILE" > "$MATCHED_OUTFILE"
    
    echo "  ✅ Matcheo completado"
  else
    END=$(date +%s)
    DURATION=$((END - START))
    echo "  ❌ Falló después de ${DURATION}s — revisá $LOGFILE"
    # Crear log con error
    echo "ERROR: Falló el procesamiento de $pdf después de ${DURATION}s" >> "$LOGFILE"
  fi

  # Pequeña pausa entre PDFs para no saturar NVIDIA API
  echo "  ⏳ Pausa de 3s antes del próximo..."
  sleep 3
done

# Consolidar todos los resultados en un solo archivo
echo ""
echo "══════════════════════════════════════════════════"
echo "  Consolidando resultados..."
echo "══════════════════════════════════════════════════"

ALL_RECIPES="[]"
for pdf in "${PDFS[@]}"; do
  BASENAME="${pdf%.pdf}"
  MATCHED_OUTFILE="$OUT_DIR/${BASENAME}-matched.json"
  
  if [ -f "$MATCHED_OUTFILE" ]; then
    RECIPES=$(node -e "
      const fs = require('fs');
      const r = JSON.parse(fs.readFileSync('$MATCHED_OUTFILE','utf8'));
      r.forEach(recipe => { recipe.source = '$BASENAME'; });
      console.log(JSON.stringify(r));
    ")
    ALL_RECIPES=$(node -e "
      const all = JSON.parse('$ALL_RECIPES');
      const more = JSON.parse('$RECIPES');
      console.log(JSON.stringify([...all, ...more]));
    ")
  fi
done

TOTAL_RECIPES=$(node -e "const r=JSON.parse('$ALL_RECIPES'); console.log(r.length)")
echo "$ALL_RECIPES" > "$OUT_DIR/lote1-all-recipes.json"
echo "$ALL_RECIPES" > "scripts/seed-data/lote1-recipes.json"
echo ""
echo "══════════════════════════════════════════════════"
echo "  ✅ LOTE 1 COMPLETO"
echo "  Total recetas: $TOTAL_RECIPES"
echo "  Guardado en:"
echo "    - $OUT_DIR/lote1-all-recipes.json"
echo "    - scripts/seed-data/lote1-recipes.json"
echo "══════════════════════════════════════════════════"
