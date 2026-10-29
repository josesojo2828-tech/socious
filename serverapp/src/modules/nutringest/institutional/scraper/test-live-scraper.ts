import { PlazasScraperStrategy } from "./plazas-scraper.strategy";

async function run() {
  const query = process.argv[2] || "arroz";
  console.log(`=== Probando Scraper de Plaza's en Vivo ===`);
  console.log(`Buscando término: "${query}"...\n`);

  const scraper = new PlazasScraperStrategy();
  const startTime = Date.now();
  const result = await scraper.scrapeFoodPrice(query);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`Respuesta del Servidor (${duration}s):`);
  console.log(JSON.stringify(result, null, 2));
  console.log(`\n=== Fin de la Prueba ===`);
}

run().catch((err) => {
  console.error("Error ejecutando la prueba:", err);
});
