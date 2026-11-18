// PreToolUse: impide que Claude lea o edite los .env con secretos reales y que
// reactive `synchronize: true` de TypeORM. Mismo archivo en backend y frontend.
// Exit 2 bloquea la herramienta y le muestra el motivo a Claude.
const fs = require('fs');
const path = require('path');

let entrada;
try {
  entrada = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^\uFEFF/, ''));
} catch {
  process.exit(0);
}
const herramienta = entrada.tool_name;
const datos = entrada.tool_input || {};

// .env, .env.local, .env.production, .env.development.local... pero no .env.example.
const SUFIJO = '(\\.(local|production|development|test)|\\.[\\w-]+\\.local)?';
const ARCHIVO_ENV = new RegExp(`^\\.env${SUFIJO}$`);
const ENV_EN_COMANDO = new RegExp(`(^|[\\s'"=/\\\\])\\.env${SUFIJO}(?=$|[\\s'"|;&<>)])`);
const SYNCHRONIZE = /synchronize\s*:\s*true/;
const CODIGO = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

function bloquear(motivo) {
  process.stderr.write(`Bloqueado por .claude/hooks/proteger-secretos.cjs: ${motivo}\n`);
  process.exit(2);
}

if (herramienta === 'Bash' || herramienta === 'PowerShell') {
  if (ENV_EN_COMANDO.test(datos.command || '')) {
    bloquear('el comando toca un archivo .env con secretos reales. Usa .env.example o pídele el dato al usuario.');
  }
  process.exit(0);
}

const archivo = datos.file_path || datos.notebook_path || '';
if (ARCHIVO_ENV.test(path.basename(archivo))) {
  bloquear('los archivos .env tienen secretos reales y no se leen ni editan desde Claude. Documenta variables nuevas en .env.example y deja que el usuario las aplique.');
}

if (CODIGO.test(archivo)) {
  const textos = [datos.content, datos.new_string];
  if (Array.isArray(datos.edits)) textos.push(...datos.edits.map((e) => e && e.new_string));
  if (textos.some((t) => typeof t === 'string' && SYNCHRONIZE.test(t))) {
    bloquear('`synchronize: true` está prohibido, también en desarrollo: ya borró CHECKs en producción. Los cambios de esquema van por migración (ver .claude/rules/migraciones.md del backend).');
  }
}
process.exit(0);
