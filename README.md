# MetalTrack Pro

Система учёта металла: приход/расход, остатки, работы, справочники. Supabase + React.

## Локальный запуск

1. `npm install`
2. Скопируй `.env.example` в `.env` и укажи `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`
3. В Supabase выполни миграцию из `supabase/migrations/001_initial_schema.sql`
4. Создай пользователя в Supabase (Authentication → Users)
5. `npm run dev`

## Деплой на GitHub Pages

1. Создай репозиторий на GitHub и запушь код (ветка `main`).
2. В репозитории: **Settings → Secrets and variables → Actions** — добавь секреты:
   - `VITE_SUPABASE_URL` — URL проекта Supabase
   - `VITE_SUPABASE_ANON_KEY` — Publishable (или anon) ключ
3. **Settings → Pages** — в разделе **Build and deployment** выбери **Source: GitHub Actions**.
4. При каждом пуше в `main` workflow соберёт проект и задеплоит на Pages.
5. Сайт будет доступен по адресу: `https://<username>.github.io/<repo-name>/`

Роутинг использует HashRouter (`#/login`, `#/`), поэтому базовый путь Pages не ломает навигацию.

## Про ошибки в консоли

- **gosuslugi.plugin.extension** — расширение браузера (Госуслуги), не код приложения. Можно игнорировать.
- **A listener indicated an asynchronous response...** — обычно от расширений браузера, не от приложения.
