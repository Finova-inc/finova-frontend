// Stop: si Claude cambió código y CHANGELOG.md no se tocó después, le recuerda
// (una vez por sesión) que todo cambio de comportamiento lleva su entrada en
// [Sin publicar] con el ticket FIN-xx. Mismo archivo en ambos repos.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

let entrada;
try {
  entrada = JSON.parse(fs.readFileSync(0, 'utf8').replace(/^\uFEFF/, ''));
} catch {
  process.exit(0);
}
if (entrada.stop_hook_active) process.exit(0);

const sesion = String(entrada.session_id || 'sin-sesion').replace(/[^\w-]/g, '');
const marca = path.join(os.tmpdir(), `finova-changelog-${sesion}`);
if (fs.existsSync(marca)) process.exit(0);

const raiz = process.env.CLAUDE_PROJECT_DIR || entrada.cwd || process.cwd();
const esBackend = fs.existsSync(path.join(raiz, 'nest-cli.json'));
const git = spawnSync('git', ['status', '--porcelain'], { cwd: raiz, encoding: 'utf8' });
if (git.status !== 0) process.exit(0);

function esCodigo(ruta) {
  if (esBackend) return ruta.startsWith('src/') && !ruta.endsWith('.spec.ts');
  if (ruta === 'proxy.ts' || ruta === 'next.config.ts') return true;
  return /^(app|components|lib)\//.test(ruta) && !ruta.endsWith('.test.mjs');
}

const cambiados = git.stdout
  .split('\n')
  .filter(Boolean)
  .map((linea) => linea.slice(3).split(' -> ').pop().replace(/^"|"$/g, ''))
  .filter(esCodigo);
if (cambiados.length === 0) process.exit(0);

function fecha(ruta) {
  try {
    return fs.statSync(path.join(raiz, ruta)).mtimeMs;
  } catch {
    return 0;
  }
}
const ultimoCambio = Math.max(...cambiados.map(fecha));
if (fecha('CHANGELOG.md') >= ultimoCambio) process.exit(0);

fs.writeFileSync(marca, '');
process.stderr.write(
  'Recordatorio de .claude/hooks/recordar-changelog.cjs: hay cambios de código sin una entrada nueva en CHANGELOG.md. ' +
    'Si el cambio altera el comportamiento, agrega la línea en [Sin publicar] con su ticket FIN-xx (comando /changelog). ' +
    'Si es solo refactor, pruebas o documentación, o el usuario no quiere registrarlo todavía, dilo en una línea y termina.\n',
);
process.exit(2);
