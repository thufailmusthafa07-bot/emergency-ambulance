const fs = require('fs');
const path = require('path');

function searchDir(dir, results = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      searchDir(fullPath, results);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        // Matches fetch, apiFetch, api.get, api.post, etc.
        const match = line.match(/(apiFetch|api\.(get|post|patch|put|delete)|fetchApi|fetch)\s*\(\s*[`'"](\/[^`'"]*)[`'"]/);
        if (match) {
          results.push({
            file: path.relative('c:/Users/thufa/OneDrive/Desktop/MP', fullPath),
            line: idx + 1,
            call: match[0],
            endpoint: match[3]
          });
        }
      });
    }
  }
  return results;
}

const calls = searchDir('c:/Users/thufa/OneDrive/Desktop/MP/src');
console.log("=== ALL FRONTEND API CALLS (" + calls.length + ") ===");
calls.forEach(c => console.log(`${c.file}:${c.line} -> ${c.endpoint} (${c.call})`));
