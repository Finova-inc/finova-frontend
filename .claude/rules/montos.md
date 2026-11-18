---
paths:
  - "app/**"
  - "components/**"
  - "lib/**"
---

# Montos

- **Los montos llegan del backend como `string`**, porque Postgres los guarda como `numeric`. Así se tipan en `lib/api.ts`, y se mantienen como `string`.
- **Nunca `+`, `-`, `Number()` ni `parseFloat` sobre dinero.** Usa `lib/decimal.ts` (aritmética exacta con BigInt), espejo de `src/common/utils/decimal.util.ts` del backend. Si cambias la semántica de uno, cambia el otro en un PR enlazado.
- **Para mostrar**, usa `formatearCLP` o `formatearMontoCorto` (`lib/formato.ts`). El negativo se escribe `-$100`.
- **Formularios con balance en vivo** (como `FormularioAsiento`): suman con `lib/decimal.ts`. El backend vuelve a validar la partida doble.
- **Pruebas de dinero:** con decimales, negativos y montos grandes, no solo enteros redondos.
