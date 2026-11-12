// PostToolUse: corre el linter del repo sobre el archivo que Claude acaba de
// editar (oxlint en el backend, eslint en el frontend). Errores: exit 2, Claude
// los ve y los corrige. Solo advertencias: se le pasan como contexto, sin
// bloquear (mismo criterio que `npm run lint`). Mismo archivo en ambos repos.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

let entrada;
try {
  entrada = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^\uFEFF/, ''));
} catch {
  process.exit(0);
}
const raiz = process.env.CLAUDE_PROJECT_DIR || entrada.cwd || process.cwd();
const archivo = entrada.tool_input && entrada.tool_input.file_path;
if (!archivo || !/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(archivo)) process.exit(0);

const relativo = path.relative(raiz, path.resolve(raiz, archivo)).split(path.sep).join('/');
const fueraDelRepo = relativo.startsWith('..') || path.isAbsolute(relativo);
const ignorado = /^(node_modules|dist|\.next|out|build|coverage|\.claude)\//.test(relativo);
if (fueraDelRepo || ignorado) process.exit(0);

// Se llama al script del linter con node, sin npx: npx tarda varios segundos por edición.
const esBackend = fs.existsSync(path.join(raiz, 'nest-cli.json'));
const linter = esBackend ? 'oxlint' : 'eslint';
const script = path.join(raiz, 'node_modules', ...(esBackend ? ['oxlint', 'bin', 'oxlint'] : ['eslint', 'bin', 'eslint.js']));
if (!fs.existsSync(script)) process.exit(0);

const r = spawnSync(process.execPath, [script, relativo], { cwd: raiz, encoding: 'utf8', timeout: 60000 });
// Si el linter no pudo correr (timeout, error al lanzarlo) no se bloquea el trabajo.
if (r.error || r.status === null) process.exit(0);

const salida = `${r.stdout || ''}${r.stderr || ''}`.trim().slice(-4000);
if (r.status !== 0) {
  process.stderr.write(`${linter} encontró errores en ${relativo}. Corrígelos antes de seguir:\n${salida}\n`);
  process.exit(2);
}
if (/warning/i.test(salida) && !/Found 0 warnings/.test(salida)) {
  const aviso = `${linter} dejó advertencias en ${relativo} (no bloquean, pero corrígelas si las introdujo tu cambio):\n${salida}`;
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: aviso } }));
}
process.exit(0);
