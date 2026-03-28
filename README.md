# Backend de autenticacion (Etapa 1)

Este backend agrega:

- Registro de usuarios
- Login
- Sesion con cookie JWT (`httpOnly`)
- Endpoint para consultar usuario autenticado
- Logout
- Endpoint admin para listar usuarios (`x-admin-key`)

## 1) Instalar dependencias

Desde `backend/`:

```bash
npm install
```

## 2) Configurar entorno

Copiar el ejemplo y editar:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Asegurate de definir un `JWT_SECRET` largo y privado.
Tambien defini `ADMIN_DASHBOARD_KEY` (clave privada para ver panel admin).

## 3) Ejecutar

```bash
npm run dev
```

Servidor en:

- `http://localhost:3000`
- Frontend principal: `http://localhost:3000/index.html`
- Acceso usuarios: `http://localhost:3000/auth.html`
- Panel admin: `http://localhost:3000/admin.html`

## Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/admin/users` (requiere header `x-admin-key`)
- `POST /api/admin/users/deduplicate` (requiere header `x-admin-key`)
- `GET /api/admin/usage-summary` (requiere header `x-admin-key`)
- `POST /api/usage/track` (tracking automatico de generaciones)
- `GET /api/health`

## Nota de arquitectura

Por velocidad de arranque, los usuarios se guardan en `backend/data/users.json`.
Para produccion, recomendamos migrar a Postgres/MySQL y agregar verificacion de email.
