import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  ChevronDown,
  LogIn,
  Users,
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  Receipt,
  Banknote,
  Hammer,
  Building2,
  Boxes,
  Book,
  History,
  Lightbulb,
  Trash2,
  HelpCircle,
  Search,
} from 'lucide-react';

interface SectionProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({ id, icon, title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-blue-600 flex-shrink-0">{icon}</span>
        <span className="text-base font-semibold text-slate-800 flex-1">{title}</span>
        <ChevronDown
          size={20}
          className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-100">{children}</div>}
    </div>
  );
};

interface FieldRow {
  name: string;
  desc: string;
  required?: boolean;
}

const FieldTable: React.FC<{ fields: FieldRow[] }> = ({ fields }) => (
  <div className="overflow-x-auto mt-3">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200">
          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Поле</th>
          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Описание</th>
          <th className="py-2 px-3 w-8"></th>
        </tr>
      </thead>
      <tbody>
        {fields.map((f) => (
          <tr key={f.name} className="border-b border-slate-100">
            <td className="py-2 px-3 font-medium text-slate-700 whitespace-nowrap">{f.name}</td>
            <td className="py-2 px-3 text-slate-600">{f.desc}</td>
            <td className="py-2 px-3 text-center">
              {f.required ? (
                <span className="text-red-500 font-bold text-xs">*</span>
              ) : (
                <span className="text-slate-300 text-xs">--</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Step: React.FC<{ n: number; title: string; desc: string }> = ({ n, title, desc }) => (
  <div className="flex gap-3 mt-3">
    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
      {n}
    </div>
    <div>
      <p className="font-medium text-slate-700 text-sm">{title}</p>
      <p className="text-slate-500 text-sm">{desc}</p>
    </div>
  </div>
);

const Callout: React.FC<{ type?: 'info' | 'warn' | 'default'; children: React.ReactNode }> = ({
  type = 'default',
  children,
}) => {
  const border =
    type === 'warn' ? 'border-l-red-500' : type === 'info' ? 'border-l-cyan-500' : 'border-l-amber-500';
  return (
    <div className={`mt-4 bg-slate-50 border-l-4 ${border} rounded-r-lg px-4 py-3 text-sm text-slate-600`}>
      {children}
    </div>
  );
};

const CodeBlock: React.FC<{ children: string }> = ({ children }) => (
  <pre className="mt-3 bg-slate-900 text-slate-200 rounded-lg px-4 py-3 text-xs leading-relaxed overflow-x-auto whitespace-pre">
    {children}
  </pre>
);

const Help: React.FC = () => {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');

  const sections = [
    { id: 'login', title: '1. Вход в систему' },
    { id: 'roles', title: '2. Роли: оператор и админ' },
    { id: 'dashboard', title: '3. Главная' },
    { id: 'movements', title: '4. Движение металла' },
    { id: 'inventory', title: '5. Остатки на складе' },
    { id: 'expenses', title: '6. Расходы' },
    { id: 'money', title: '7. Деньги (финансовая сводка)' },
    { id: 'works', title: '8. Работы' },
    { id: 'companies', title: '9. Компании' },
    { id: 'materials', title: '10. Материалы' },
    { id: 'rates', title: '11. Тарифы' },
    { id: 'history', title: '12. История (админ)' },
    { id: 'concepts', title: '13. Ключевые понятия' },
    { id: 'reset', title: '14. Как удалить все данные' },
    { id: 'faq', title: '15. Частые вопросы' },
  ];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-4xl space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="text-blue-600" />
          База знаний
        </h2>
        <p className="text-slate-500 text-sm mt-1">Полное руководство по MetalTrack Pro. Каждый раздел, каждое поле.</p>
      </div>

      {/* Search + TOC */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по разделам..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
          {sections
            .filter((s) => s.title.toLowerCase().includes(search.toLowerCase()))
            .map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className="text-left text-sm px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors truncate"
              >
                {s.title}
              </button>
            ))}
        </div>
      </div>

      {/* ========== 1. LOGIN ========== */}
      <Section id="login" icon={<LogIn size={20} />} title="1. Вход в систему" defaultOpen>
        <Step n={1} title="Открой приложение" desc="Если ты не залогинен, тебя автоматически перекинет на страницу входа." />
        <Step n={2} title="Введи email и пароль" desc="Те, что тебе дал администратор. Нажми «Войти»." />
        <Step n={3} title="Ты внутри" desc="Откроется главная страница. В левом меню (или внизу на телефоне) все разделы. Сессия сохраняется, пока не нажмёшь «Выйти»." />
        <Callout type="warn">
          <strong>Неверный пароль?</strong> Появится сообщение об ошибке. Проверь раскладку и caps lock. Если забыл пароль — пиши администратору.
        </Callout>
      </Section>

      {/* ========== 2. ROLES ========== */}
      <Section id="roles" icon={<Users size={20} />} title="2. Роли: оператор и админ">
        <p className="text-sm text-slate-600 mt-3">В системе две роли. Какая у тебя — видно в правом верхнем углу (бейдж).</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-sm text-blue-700 mb-2">Оператор может</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />Добавлять движения (приход/расход)</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />Добавлять расходы и работы</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />Смотреть остатки, деньги, справочники</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />Удалять только <strong>свои</strong> записи</li>
            </ul>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-sm text-red-600 mb-2">Оператор НЕ может</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />Удалять чужие записи</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />Редактировать справочники</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />Открывать раздел «История»</li>
            </ul>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-3">
          <h4 className="font-semibold text-sm text-amber-800 mb-2">Админ — всё то же + дополнительно</h4>
          <ul className="text-sm text-slate-600 space-y-1">
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />Удалять любые записи (не только свои)</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />Добавлять/редактировать/удалять компании, материалы, тарифы</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />Раздел «История» — полный аудит всех изменений</li>
          </ul>
        </div>
      </Section>

      {/* ========== 3. DASHBOARD ========== */}
      <Section id="dashboard" icon={<LayoutDashboard size={20} />} title="3. Главная">
        <p className="text-sm text-slate-600 mt-3">Первое, что видишь после входа. Сводка по всему.</p>

        <h4 className="font-semibold text-sm text-slate-700 mt-4 mb-2">Верхние карточки — вес</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-sm text-slate-700">Остаток на складе</p>
            <p className="text-xs text-slate-500">Сколько тонн лежит. Приход минус расход.</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-sm text-slate-700">Приход (вес)</p>
            <p className="text-xs text-slate-500">Общий вес всего, что приходило.</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-sm text-slate-700">Расход (вес)</p>
            <p className="text-xs text-slate-500">Общий вес всего, что уходило.</p>
          </div>
        </div>

        <h4 className="font-semibold text-sm text-slate-700 mt-4 mb-2">Нижние карточки — деньги</h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-sm text-cyan-700">Закупки</p>
            <p className="text-xs text-slate-500">Сумма приходов в рублях.</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-sm text-green-700">Продажи</p>
            <p className="text-xs text-slate-500">Сумма расходов в рублях.</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-sm text-red-700">Расходы</p>
            <p className="text-xs text-slate-500">Транспорт, аренда и т.д.</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-sm text-slate-700">Прибыль</p>
            <p className="text-xs text-slate-500">Продажи - Закупки - Расходы.</p>
          </div>
        </div>

        <p className="text-sm text-slate-500 mt-4">Внизу — столбчатая диаграмма остатков по материалам в тоннах.</p>
      </Section>

      {/* ========== 4. MOVEMENTS ========== */}
      <Section id="movements" icon={<ArrowLeftRight size={20} />} title="4. Движение металла">
        <p className="text-sm text-slate-600 mt-3">Главный раздел. Каждая покупка и продажа металла.</p>

        <h4 className="font-semibold text-sm text-slate-700 mt-4">Как добавить запись</h4>
        <Step n={1} title={'Нажми «Добавить запись»'} desc="Кнопка сверху справа. Откроется форма." />
        <Step n={2} title="Заполни поля" desc="Все поля описаны ниже. Обязательные отмечены *." />
        <Step n={3} title={'Нажми «Сохранить»'} desc="Запись появится в таблице. Остаток обновится автоматически." />

        <h4 className="font-semibold text-sm text-slate-700 mt-5">Поля формы</h4>
        <FieldTable
          fields={[
            { name: 'Дата', desc: 'Дата операции. По умолчанию сегодня.', required: true },
            { name: 'Операция', desc: 'Приход — купил/получил. Расход — продал/отгрузил.', required: true },
            { name: 'Компания', desc: 'От кого купил или кому продал.', required: true },
            { name: 'Материал', desc: 'Тип металла: труба, лист, арматура и т.д.', required: true },
            { name: 'Размер', desc: 'Свободный текст. Пример: 530x6, 89x4, Лист 10мм.', required: true },
            { name: 'Владение', desc: '«Наш товар» или «Товар клиента».', required: true },
            { name: 'Вес (тонн)', desc: 'Вес в тоннах. Можно с тысячными: 1.250.', required: true },
            { name: 'Цена за тонну', desc: 'Цена закупки/продажи. Сумма сделки = вес x цена (авто).' },
            { name: 'Стоимость погр./разгр.', desc: 'Сколько заплатили за погрузку этой партии.' },
            { name: 'Примечание', desc: 'Любой комментарий. Номер машины, накладной и т.д.' },
          ]}
        />

        <Callout>
          <strong>Сумма сделки</strong> считается автоматически: вес x цена за тонну. Если цена не указана, сумма = 0.
        </Callout>
        <Callout type="warn">
          <strong>Отрицательный баланс.</strong> Если при расходе остаток уйдёт в минус, система покажет предупреждение.
        </Callout>

        <h4 className="font-semibold text-sm text-slate-700 mt-5">Как удалить запись</h4>
        <p className="text-sm text-slate-600 mt-1">Иконка корзины справа. Оператор — только свои. Админ — любые. Остаток пересчитается.</p>
      </Section>

      {/* ========== 5. INVENTORY ========== */}
      <Section id="inventory" icon={<Package size={20} />} title="5. Остатки на складе">
        <p className="text-sm text-slate-600 mt-3">Автоматический расчёт. Ничего вводить не надо — всё из движений.</p>

        <h4 className="font-semibold text-sm text-slate-700 mt-4">Режимы просмотра</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-sm text-slate-700">Сводно</p>
            <p className="text-xs text-slate-500">Группировка по материал + размер + владение. Общая картина склада.</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-sm text-slate-700">По компаниям</p>
            <p className="text-xs text-slate-500">Кнопка «Разбить по компаниям». Видно, сколько у кого.</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-sm text-slate-700">Фильтр по владению</p>
            <p className="text-xs text-slate-500">Все / Только наши / Товар клиента.</p>
          </div>
        </div>

        <h4 className="font-semibold text-sm text-slate-700 mt-4">Колонки</h4>
        <FieldTable
          fields={[
            { name: 'Компания', desc: 'Только в режиме «По компаниям».' },
            { name: 'Материал', desc: 'Тип металла.' },
            { name: 'Размер', desc: 'Размер (530x6 и т.д.).' },
            { name: 'Владение', desc: '«Наш» или «Клиента».' },
            { name: 'Остаток (т)', desc: 'Тонны. Приход минус расход. Красный, если минус.' },
            { name: 'Стоимость', desc: 'Рубли. Средняя цена закупки x остаток.' },
          ]}
        />

        <Callout type="info">
          <strong>Экспорт CSV</strong> — кнопка скачивает текущую таблицу (с учётом фильтров) в файл для Excel.
        </Callout>
      </Section>

      {/* ========== 6. EXPENSES ========== */}
      <Section id="expenses" icon={<Receipt size={20} />} title="6. Расходы">
        <p className="text-sm text-slate-600 mt-3">Все затраты, не связанные с покупкой/продажей: транспорт, аренда, зарплата.</p>

        <h4 className="font-semibold text-sm text-slate-700 mt-4">Как добавить</h4>
        <Step n={1} title={'Нажми «Добавить расход»'} desc="Кнопка сверху справа." />
        <Step n={2} title="Заполни поля" desc="Дата, категория, описание, сумма. Компания не обязательна." />
        <Step n={3} title="Сохрани" desc="Расход появится в таблице и в сводке «Деньги»." />

        <h4 className="font-semibold text-sm text-slate-700 mt-5">Поля формы</h4>
        <FieldTable
          fields={[
            { name: 'Дата', desc: 'Дата расхода. По умолчанию сегодня.', required: true },
            { name: 'Категория', desc: 'Транспорт / Погрузка / Обработка / Аренда-ЗП / Прочее.', required: true },
            { name: 'Описание', desc: 'Что за расход. «Доставка трубы 530 из Челябинска».', required: true },
            { name: 'Сумма', desc: 'Сколько потрачено в рублях.', required: true },
            { name: 'Компания', desc: 'К какой компании относится. Можно не указывать.' },
            { name: 'Примечание', desc: 'Любой комментарий.' },
          ]}
        />

        <h4 className="font-semibold text-sm text-slate-700 mt-5">Категории</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
          {[
            { name: 'Транспорт', desc: 'Доставка, перевозка' },
            { name: 'Погрузка', desc: 'Погрузка, разгрузка' },
            { name: 'Обработка', desc: 'Резка, сварка' },
            { name: 'Аренда / ЗП', desc: 'Склад, зарплата' },
            { name: 'Прочее', desc: 'Всё остальное' },
          ].map((c) => (
            <div key={c.name} className="bg-slate-50 rounded-lg p-2 text-center">
              <p className="font-medium text-xs text-slate-700">{c.name}</p>
              <p className="text-xs text-slate-400">{c.desc}</p>
            </div>
          ))}
        </div>

        <Callout type="info">
          <strong>Фильтры</strong> — поиск по описанию + фильтр по категории. Итоговая сумма внизу таблицы.
        </Callout>
      </Section>

      {/* ========== 7. MONEY ========== */}
      <Section id="money" icon={<Banknote size={20} />} title="7. Деньги (финансовая сводка)">
        <p className="text-sm text-slate-600 mt-3">Сколько потратили, сколько заработали, прибыль, у кого сколько металла.</p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 text-center">
          <p className="font-semibold text-sm text-blue-800">
            ПРИБЫЛЬ = <span className="text-green-700">Продажи</span> - <span className="text-red-600">Закупки</span> - <span className="text-red-600">Расходы</span>
          </p>
          <p className="text-xs text-blue-600 mt-1">Зелёная, если плюс. Красная, если минус.</p>
        </div>

        <h4 className="font-semibold text-sm text-slate-700 mt-4">Карточки вверху</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs font-semibold text-cyan-700">Закупки</p>
            <p className="text-xs text-slate-500">Сумма приходов</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs font-semibold text-green-700">Продажи</p>
            <p className="text-xs text-slate-500">Сумма расходов</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs font-semibold text-red-700">Расходы</p>
            <p className="text-xs text-slate-500">Из раздела «Расходы»</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs font-semibold text-slate-700">Прибыль</p>
            <p className="text-xs text-slate-500">Итого</p>
          </div>
        </div>

        <h4 className="font-semibold text-sm text-slate-700 mt-4">Таблица «По компаниям»</h4>
        <FieldTable
          fields={[
            { name: 'Компания', desc: 'Энергоинвест, Никамет и т.д.' },
            { name: 'Закупки', desc: 'На сколько рублей закупили у/для этой компании.' },
            { name: 'Продажи', desc: 'На сколько рублей продали этой компании.' },
            { name: 'Остаток (т)', desc: 'Тонны металла за этой компанией.' },
            { name: 'Стоимость', desc: 'Средняя цена закупки x остаток.' },
          ]}
        />

        <Callout>
          <strong>Энергоинвест</strong> будет отдельной строкой — сколько у них металла, на какую сумму, закупки и продажи.
        </Callout>

        <p className="text-sm text-slate-500 mt-3">Внизу — горизонтальный график расходов по категориям.</p>
      </Section>

      {/* ========== 8. WORKS ========== */}
      <Section id="works" icon={<Hammer size={20} />} title="8. Работы">
        <p className="text-sm text-slate-600 mt-3">Учёт выполненных услуг: резка, сварка и т.д. Сумма считается по тарифу.</p>

        <Step n={1} title={'Нажми «Добавить работу»'} desc="Откроется форма." />
        <Step n={2} title="Заполни поля" desc="Дата, компания, материал (не обязательно), вид работ (из тарифов), количество." />
        <Step n={3} title="Сумма сама" desc="Количество x цена из тарифа = итого. Сохрани." />

        <Callout type="info">
          <strong>Работы vs Расходы.</strong> «Работы» — услуги с ценой за единицу из тарифов (резка 1500 руб/тн). «Расходы» — произвольные затраты (транспорт 15 000 руб, аренда 50 000 руб).
        </Callout>
      </Section>

      {/* ========== 9. COMPANIES ========== */}
      <Section id="companies" icon={<Building2 size={20} />} title="9. Компании">
        <p className="text-sm text-slate-600 mt-3">Справочник контрагентов.</p>

        <FieldTable
          fields={[
            { name: 'Название', desc: 'Уникальное имя: Энергоинвест, Никамет, ТрубоСталь.' },
            { name: 'Тип', desc: 'Поставщик / Покупатель / Поставщик и покупатель.' },
            { name: 'Статус', desc: 'Активна/Неактивна. Неактивные не видны в выпадающих списках.' },
          ]}
        />

        <Callout>
          <strong>Только админ</strong> может добавлять, редактировать и удалять компании.
        </Callout>
        <p className="text-sm text-slate-500 mt-2">Чекбокс «Показать неактивные» покажет скрытые компании. Клик на статус — быстро переключает (только для админа).</p>
      </Section>

      {/* ========== 10. MATERIALS ========== */}
      <Section id="materials" icon={<Boxes size={20} />} title="10. Материалы">
        <p className="text-sm text-slate-600 mt-3">Справочник типов металла. Работает так же, как компании: название + статус. Только админ может менять.</p>

        <div className="flex flex-wrap gap-2 mt-3">
          {['Труба', 'Лист', 'Арматура', 'Швеллер', 'Уголок', 'Балка'].map((m) => (
            <span key={m} className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-600">{m}</span>
          ))}
        </div>

        <Callout type="info">
          <strong>Размер</strong> указывается не здесь, а в движении. Материал — общий тип (труба). Размер — конкретика (530x6).
        </Callout>
      </Section>

      {/* ========== 11. RATES ========== */}
      <Section id="rates" icon={<Book size={20} />} title="11. Тарифы">
        <p className="text-sm text-slate-600 mt-3">Справочник цен на работы. Используется при создании записей в «Работы».</p>

        <FieldTable
          fields={[
            { name: 'Вид работ', desc: 'Название: Резка газом, Сварка стык, Зачистка.' },
            { name: 'Ед. измерения', desc: 'Тонна, штука, пог. метр, час.' },
            { name: 'Цена за ед.', desc: 'Сколько стоит одна единица в рублях.' },
            { name: 'Статус', desc: 'Активен/Неактивен.' },
          ]}
        />

        <Callout>
          <strong>Только админ</strong> может менять тарифы. Редактирование — иконка карандаша в строке.
        </Callout>
      </Section>

      {/* ========== 12. HISTORY ========== */}
      <Section id="history" icon={<History size={20} />} title="12. История (только для админа)">
        <p className="text-sm text-slate-600 mt-3">Полный аудит. Кто, когда, что сделал. Оператор этот раздел не видит.</p>

        <h4 className="font-semibold text-sm text-slate-700 mt-4">Что записывается</h4>
        <p className="text-sm text-slate-600 mt-1">Каждое создание, изменение и удаление: движения, расходы, работы, позиции, компании, материалы, тарифы.</p>

        <h4 className="font-semibold text-sm text-slate-700 mt-4">Колонки</h4>
        <FieldTable
          fields={[
            { name: 'Дата и время', desc: 'Когда произошло.' },
            { name: 'Пользователь', desc: 'Кто сделал (email).' },
            { name: 'Таблица', desc: 'Движения, Расходы, Работы, Компании и т.д.' },
            { name: 'Действие', desc: 'Создание / Изменение / Удаление.' },
            { name: 'Было', desc: 'Старые данные (при изменении/удалении).' },
            { name: 'Стало', desc: 'Новые данные (при создании/изменении).' },
          ]}
        />

        <p className="text-sm text-slate-500 mt-3">Фильтры: по тексту, по таблице, по типу действия.</p>
      </Section>

      {/* ========== 13. CONCEPTS ========== */}
      <Section id="concepts" icon={<Lightbulb size={20} />} title="13. Ключевые понятия">
        <dl className="space-y-4 mt-3">
          <div>
            <dt className="font-semibold text-sm text-slate-700">Позиция</dt>
            <dd className="text-sm text-slate-600 mt-0.5">Уникальная комбинация: <strong>компания + материал + размер + владение</strong>. Пример: «Энергоинвест / Труба / 530x6 / Наш товар». По ней считается баланс. Создаётся автоматически при первом движении.</dd>
          </div>
          <div>
            <dt className="font-semibold text-sm text-slate-700">Владение</dt>
            <dd className="text-sm text-slate-600 mt-0.5"><strong>Наш товар</strong> — металл наш, мы его купили. <strong>Товар клиента</strong> — чужой металл на нашем складе.</dd>
          </div>
          <div>
            <dt className="font-semibold text-sm text-slate-700">Приход и расход</dt>
            <dd className="text-sm text-slate-600 mt-0.5"><strong>Приход</strong> — металл пришёл на склад. <strong>Расход</strong> — ушёл. Баланс = приход - расход.</dd>
          </div>
          <div>
            <dt className="font-semibold text-sm text-slate-700">Цена за тонну и сумма сделки</dt>
            <dd className="text-sm text-slate-600 mt-0.5">При каждом движении указывается цена. Система умножает на вес = сумма. По этим суммам — закупки, продажи, прибыль.</dd>
          </div>
          <div>
            <dt className="font-semibold text-sm text-slate-700">Средняя цена закупки</dt>
            <dd className="text-sm text-slate-600 mt-0.5">Для оценки остатка. Купил 10 т по 50 000 + 5 т по 60 000 = средняя (500 000 + 300 000) / 15 = 53 333 руб/т. Остаток 8 т = 426 667 руб.</dd>
          </div>
        </dl>
      </Section>

      {/* ========== 14. RESET ========== */}
      {isAdmin && (
        <Section id="reset" icon={<Trash2 size={20} />} title="14. Как удалить все данные">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-3">
            <p className="text-sm font-semibold text-red-800">Внимание. Это необратимо.</p>
            <p className="text-xs text-red-600 mt-1">После выполнения данные восстановить невозможно.</p>
          </div>

          <Step n={1} title="Открой Supabase Dashboard" desc="supabase.com, твой проект, SQL Editor в левом меню." />
          <Step n={2} title="Скопируй нужный SQL" desc="Выбери вариант ниже, вставь, нажми Run." />
          <Step n={3} title="Обнови приложение" desc="F5 в браузере. Данные исчезнут." />

          <h4 className="font-semibold text-sm text-slate-700 mt-5">Вариант А — только операции (справочники останутся)</h4>
          <CodeBlock>{`DELETE FROM public.audit_log;
DELETE FROM public.work_logs;
DELETE FROM public.expenses;
DELETE FROM public.movements;
DELETE FROM public.positions;`}</CodeBlock>

          <h4 className="font-semibold text-sm text-slate-700 mt-5">Вариант Б — полный сброс (кроме пользователей)</h4>
          <CodeBlock>{`DELETE FROM public.audit_log;
DELETE FROM public.work_logs;
DELETE FROM public.expenses;
DELETE FROM public.movements;
DELETE FROM public.positions;
DELETE FROM public.service_rates;
DELETE FROM public.materials;
DELETE FROM public.companies;`}</CodeBlock>

          <h4 className="font-semibold text-sm text-slate-700 mt-5">Вариант В — по одной таблице</h4>
          <FieldTable
            fields={[
              { name: 'Движения + остатки', desc: 'DELETE FROM public.movements; DELETE FROM public.positions;' },
              { name: 'Расходы', desc: 'DELETE FROM public.expenses;' },
              { name: 'Работы', desc: 'DELETE FROM public.work_logs;' },
              { name: 'История', desc: 'DELETE FROM public.audit_log;' },
            ]}
          />

          <Callout type="warn">
            <strong>Порядок важен.</strong> Нельзя удалить компании, пока есть движения. Сначала данные, потом справочники. В вариантах А и Б порядок уже правильный.
          </Callout>
        </Section>
      )}

      {/* ========== 15. FAQ ========== */}
      <Section id="faq" icon={<HelpCircle size={20} />} title="15. Частые вопросы">
        {[
          {
            q: 'Добавил движение без цены. Что делать?',
            a: 'Цена = 0, сумма = 0. В финансовой сводке запись не учтётся в деньгах, но вес посчитается. Удали и создай заново с ценой.',
          },
          {
            q: 'Как увидеть, сколько металла у Энергоинвеста?',
            a: 'Раздел «Деньги» — таблица «По компаниям», строка Энергоинвест. Или «Остатки» — режим «Разбить по компаниям».',
          },
          {
            q: 'Как посмотреть прибыль?',
            a: 'Раздел «Деньги» — карточка «Прибыль». Или «Главная» — там тоже есть. Формула: Продажи - Закупки - Расходы.',
          },
          {
            q: 'В чём разница между «Работами» и «Расходами»?',
            a: '«Работы» — услуги по тарифу (резка 1500 руб/тн). «Расходы» — произвольные затраты (транспорт 15 000, аренда 50 000).',
          },
          {
            q: 'Могу ли я отредактировать движение?',
            a: 'Нет, пока не поддерживается. Удали и создай заново с правильными данными.',
          },
          {
            q: 'Компания не удаляется. Почему?',
            a: 'К ней привязаны записи. Удали связанные движения/работы/расходы или сделай компанию неактивной.',
          },
          {
            q: 'Баланс ушёл в минус. Нормально?',
            a: 'Система разрешает, но предупреждает. Может быть ошибка (забыли приход) или осознанный минус. Проверь записи.',
          },
          {
            q: 'Как на телефоне?',
            a: 'Та же ссылка. Внизу — навигация (Главная, Движение, Остатки, Деньги, Ещё). Таблицы превращаются в карточки.',
          },
          {
            q: 'Экспорт в Excel?',
            a: 'Раздел «Остатки» — кнопка «Экспорт CSV». Файл открывается в Excel.',
          },
          {
            q: 'Кто может менять справочники?',
            a: 'Только Админ. Оператор видит, но менять не может.',
          },
        ].map((item) => (
          <details key={item.q} className="mt-2 group">
            <summary className="flex items-center gap-2 cursor-pointer py-2 text-sm font-medium text-slate-700 hover:text-blue-600">
              <ChevronDown size={14} className="text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0" />
              {item.q}
            </summary>
            <p className="text-sm text-slate-500 pl-6 pb-1">{item.a}</p>
          </details>
        ))}
      </Section>
    </div>
  );
};

export default Help;
