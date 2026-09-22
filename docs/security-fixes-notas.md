# TOMFIC — Notas de la rama `security-fixes` (25 sep 2026)

Branch: `security-fixes` (base: `aws-migration`, commit `8a419dd`)
URL: https://github.com/Edwinc1987/tomfic-aws/tree/security-fixes

## Qué se arregló

### 1. Aislamiento multi-tenant (CRÍTICO)
- Antes: el API confiaba en el header `x-tenant-id` que envía el cliente
  → cualquier usuario autenticado podía leer/escribir datos de OTRA empresa.
- Ahora: `ApiAuthGuard` resuelve `tenantId` y `role` SIEMPRE desde la tabla
  `User` en la base de datos (por sub de Cognito o por email de respaldo).

### 2. Rol por defecto con mínimo privilegio (CRÍTICO)
- Antes: usuario sin grupo en Cognito quedaba como ADMIN.
- Ahora: si el usuario no está en la BD, el rol es CAPTURER (el más bajo).

### 3. Tokens de team-login firmados (CRÍTICO)
- Antes: `team-{id}-{timestamp}` sin firma ni expiración.
- Ahora: JWT HS256 firmado con `AUTH_SECRET`, expira en 12h.
  El guard verifica firma + expiración en cada request y re-resuelve la
  identidad desde la BD. Tests: `team-jwt.test.ts` (6 casos).

### 4. Contraseña de RDS fuera de las variables de entorno (ALTO)
- Antes: la contraseña llegaba en texto plano en `DATABASE_URL` (visible en
  la consola de Lambda / CloudFormation) e incluso había un fallback "changeme".
- Ahora: el CDK pasa `DB_SECRET_ARN` y `AUTH_SECRET_ARN`; en cold start
  `core/db-url.ts` compone la URL desde Secrets Manager y cachea el resultado.

### 5. Lambdas conectadas a la VPC (ALTO)
- Antes: con `ENABLE_RDS=true` la Lambda NO podía alcanzar el RDS (subnets
  aisladas sin ruta) → la API no funcionaba con base de datos real.
- Ahora: Lambdas en subnets privadas CON NAT egress + security groups que
  permiten Postgres 5432 solo desde ellas hacia el RDS.

### 6. CORS restringido
- Antes: `ALL_ORIGINS`. Ahora: solo `www.tomfic.com`, `tomfic.com`,
  `tomfic.vercel.app` (+ `CORS_EXTRA_ORIGINS` opcional en el deploy).

### 7. Build roto pre-existente reparado
- `CountSummary` incluía `name`/`status` pero el repositorio devolvía
  `nombre`/`estado` → tipos de TS roto. Ya alineados (los dos campos van).
- Faltaban `@types/express` y `@types/cors`.
- `report-template.integration.test.ts` no estaba gated con `RUN_DB_TESTS`
  → rompía `npm test` sin Postgres. Ya gated como los otros.

### 8. `tenant.nit` no existía (pre-existente)
- `team-login` devolvía `nit: tenant.nit` → campo no existe; es `taxId`.

## Estado de verificación
- ✅ `tsc --noEmit` API: 0 errores (antes: 4 errores).
- ✅ Build web Vite: verde (PWA generada).
- ✅ Vitest: 15 passed, 0 failed (los de BD quedan gated).
- ✅ CDK synth OK con ENABLE_RDS=true y false.

## Acción requerida del equipo
1. Definir `AUTH_SECRET` en `.env` local (ej: `openssl rand -hex 32`).
   En AWS ya se genera solo con el deploy (Secret `TomficAuthSecret`).
2. Mergear `security-fixes` → `aws-migration` tras revisión.
3. Desplegar con `ENABLE_RDS=true` para validar la conexión real a RDS.
4. Quitar del frontend el envío de headers `x-tenant-id`/`x-user-role`
   cuando AUTH_MODE=cognito (ya no se usan; quedan solo para dev local).
