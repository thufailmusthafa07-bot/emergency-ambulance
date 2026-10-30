const fs = require('fs');

function extractRoutes(file) {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g;
  const routes = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    routes.push({ method: match[1].toUpperCase(), path: match[2] });
  }
  return routes;
}

const compat = extractRoutes('backend/src/routes/compatRoutes.ts');
const persistent = extractRoutes('backend/src/routes/persistentCompatRoutes.ts');

console.log("=== COMPAT ROUTES ===");
compat.forEach(r => console.log(`${r.method} ${r.path}`));

console.log("\n=== PERSISTENT COMPAT ROUTES ===");
persistent.forEach(r => console.log(`${r.method} ${r.path}`));

console.log("\n=== DIFF (In Compat but NOT in Persistent) ===");
const persistentSet = new Set(persistent.map(r => `${r.method} ${r.path}`));
const missing = compat.filter(r => !persistentSet.has(`${r.method} ${r.path}`));
console.log(missing.length === 0 ? "NONE - Persistent covers 100% of compat routes!" : missing);
