# MetalTrack Pro — как устроено решение (А–Я)

Краткий обзор для последующих ТЗ и корректировок.

---

## 1. Стек и структура

| Что | Технология |
|-----|------------|
| Фронт | React 19, TypeScript, Vite 6, React Router 7 (HashRouter) |
| Бэкенд/БД | Supabase (PostgreSQL, Auth, RLS) |
| Стили | Tailwind-подобные классы + свой `index.css` (badge, login, анимации) |
| Иконки | lucide-react |
| Графики | recharts (Dashboard) |

**Структура:**
- `App.tsx` — роуты, AuthProvider, AuthGuard, Layout
- `context/AuthContext.tsx` — текущий пользователь, роли, signIn/signOut
- `services/supabase.ts` — весь API к БД (без отдельного слоя API)
- `types.ts` — типы (User, Company, Material, Position, Movement, WorkLog, AuditLog, формы)
- `pages/*` — по одной странице на раздел
- `components/` — Layout (сайдбар + шапка + нижняя навигация на мобиле), AuthGuard
- `supabase/migrations/001_initial_schema.sql` — схема, RLS, триггеры

---

## 2. Авторизация и роли

- **Вход:** Supabase Auth (`signInWithPassword`). Сессия в `localStorage`, авто-обновление токена.
- **Профиль:** при смене сессии запрос в `public.users` по `auth.uid()`; при ошибке/таймауте — fallback (email, role: operator).
- **Роли:** `admin` | `operator`. В БД хранятся в `public.users.role`; синхронизация с `auth.users` через триггер `handle_new_user` (insert в `auth.users` → insert/update в `public.users`).
- **Доступ:**
  - Все защищённые маршруты требуют авторизации (AuthGuard).
  - Маршрут `/history` доступен только при `requireAdmin` (иначе редирект на `/`).
- **Удаление записей:** оператор может удалять только свои движения/работы (`created_by === user.id`); админ — любые.

---

## 3. База данных (основные сущности)

- **users** — расширение auth (id → auth.users), email, name, role.
- **companies** — название, type (supplier/buyer/both), active, created_by.
- **materials** — название, active.
- **service_rates** — название, price, unit (шт/тн/м/п/час), active.
- **positions** — уникальная комбинация (company_id, material_id, size, ownership). Поле `balance` обновляется триггером при insert/delete в movements.
- **movements** — position_id, operation (income/expense), weight, cost, note, movement_date, created_by.
- **work_logs** — company_id, material_id (nullable), service_id, quantity, total_price, note, work_date, created_by.
- **audit_log** — table_name, record_id, action (insert/update/delete), old_data/new_data (jsonb), user_id. Заполняется триггерами по основным таблицам.

**Триггеры:**
1. `on_auth_user_created` — синхронизация auth.users → public.users.
2. `audit_*` на tables — запись в audit_log при insert/update/delete.
3. `trigger_position_balance_on_movement` — при insert/delete движения пересчёт `positions.balance` (income += weight, expense -= weight).

---

## 4. Поток данных по разделам

### 4.1 Справочники (Companies, Materials, Rates)
- Загрузка: `getCompanies(activeOnly)`, `getMaterials(activeOnly)`, `getServiceRates(activeOnly)`.
- Создание/обновление/удаление через функции из `supabase.ts`. В формах — локальный state, после успеха — обновление списка в state.
- Редактирование: inline в таблице (или карточках на мобиле) — `editingId` + `editForm`, сохранение через `update*`.

### 4.2 Движения (Movements)
- Список: `getMovements()` с join position → company, material.
- Создание: форма (MovementInput: company_id, material_id, size, ownership, operation, weight, cost, note, movement_date) → `createMovement(input)`:
  1. `findOrCreatePosition(companyId, materialId, size, ownership)` — поиск или создание позиции.
  2. Insert в `movements` с position_id, created_by.
  3. Триггер обновляет balance у позиции.
- Проверка отрицательного баланса при расходе — на фронте по текущим движениям (reduce по подходящей позиции); при отрицательном результате — confirm.
- Удаление: `deleteMovement(id)`; триггер откатывает balance.

### 4.3 Остатки (Inventory)
- Данные: `getPositions()` с join company, material.
- Агрегация на фронте:
  - Режим «по компаниям» — строки как позиции (company, material, size, ownership, balance).
  - Режим «сводно» — группировка по (material, size, ownership), сумма balance.
- Фильтр по ownership: all | own | client_storage.
- Экспорт: формирование CSV из текущего отображаемого списка, скачивание файла.

### 4.4 Работы (Works)
- Список: `getWorkLogs()` с join company, material, service.
- Создание: форма (WorkLogInput: company_id, material_id?, service_id, quantity, note, work_date) → `createWorkLog(input, pricePerUnit)`. total_price = quantity * price услуги; в БД пишется уже посчитанная сумма.
- Удаление: по тем же правилам ролей (свои/все у админа).

### 4.5 Главная (Dashboard)
- Загрузка: `getMovements()`, `getWorkLogs()`, `getPositions()` параллельно.
- Расчёт: totalIncome / totalExpense по movements, currentStock по sum(positions.balance), totalWorkValue по sum(work_logs.total_price).
- График: группировка positions по material → BarChart (остатки по материалам в тоннах).

### 4.6 История (History, только admin)
- `getAuditLogs(500)` с join user (name, email).
- Фильтры: поиск по тексту, по таблице, по действию (insert/update/delete). Отображение old_data/new_data в сокращённом виде.

### 4.7 База знаний (Help)
- Статическая страница: роли оператор/админ, разделы приложения, важные понятия (владение, позиция, отрицательный баланс). Для админа — дополнительный блок про историю и справочники.

---

## 5. UI/UX особенности

- **Адаптив:** сайдбар скрыт на мобиле (drawer по кнопке «Меню»); нижняя навигация (Главная, Движение, Остатки, Работы, «Ещё») только на md и меньше. Таблицы на десктопе; на мобиле — карточки.
- **Роутинг:** HashRouter (`#/`, `#/login`, `#/movements` и т.д.) — удобно для деплоя на GitHub Pages.
- **Модалки:** добавление движения и работы — полноэкранные снизу на мобиле, по центру на десктопе.
- **Стили:** логин — тёмная тема с анимированной рамкой; основное приложение — светлый фон, синие акценты, badge (green/red/blue/gray/orange).

---

## 6. Безопасность

- RLS включён на всех таблицах. Политики: для большинства таблиц — доступ на все операции при `auth.role() = 'authenticated'`; audit_log — SELECT для authenticated, INSERT по триггерам.
- Роль и «свои/чужие» проверяются на фронте (AuthGuard, кнопки удаления); при необходимости ужесточения — добавить RLS по role/created_by.

---

## 7. Деплой

- README: GitHub Actions (при push в main) собирает проект с секретами VITE_SUPABASE_* и деплоит на GitHub Pages. Базовый путь и HashRouter совместимы.

---

## 8. Что может понадобиться при ТЗ

- Изменение полей/таблиц (миграции).
- Новые отчёты или фильтры (движения/остатки/работы по датам, компаниям).
- Редактирование движений/работ (сейчас только создание и удаление).
- Права тоньше (например, только свои записи по компании).
- Интеграции (выгрузка, импорт).
- Доработка аудита (какие таблицы/поля логировать, экспорт истории).

Когда будет ТЗ — можно точечно править схему, сервисы и страницы по этому описанию.
