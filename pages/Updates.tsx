import React from 'react';
import { Megaphone, Sparkles, Package, Banknote, Edit3, Rocket, Ruler } from 'lucide-react';

interface UpdateCardProps {
  version: string;
  date: string;
  title: string;
  color: 'purple' | 'green' | 'blue' | 'slate' | 'amber';
  icon: React.ReactNode;
  children: React.ReactNode;
  isLatest?: boolean;
}

const colorMap = {
  purple: {
    border: 'border-purple-200',
    header: 'bg-purple-600',
    headerText: 'text-purple-200',
    badge: 'bg-purple-100 text-purple-700',
  },
  green: {
    border: 'border-green-200',
    header: 'bg-green-600',
    headerText: 'text-green-200',
    badge: 'bg-green-100 text-green-700',
  },
  blue: {
    border: 'border-blue-200',
    header: 'bg-blue-600',
    headerText: 'text-blue-200',
    badge: 'bg-blue-100 text-blue-700',
  },
  amber: {
    border: 'border-amber-200',
    header: 'bg-amber-600',
    headerText: 'text-amber-200',
    badge: 'bg-amber-100 text-amber-700',
  },
  slate: {
    border: 'border-slate-200',
    header: 'bg-slate-700',
    headerText: 'text-slate-400',
    badge: 'bg-slate-100 text-slate-700',
  },
};

const UpdateCard: React.FC<UpdateCardProps> = ({ version, date, title, color, icon, children, isLatest }) => {
  const colors = colorMap[color];
  return (
    <div className={`border ${colors.border} rounded-xl overflow-hidden ${isLatest ? 'ring-2 ring-purple-400 ring-offset-2' : ''}`}>
      <div className={`${colors.header} px-4 py-3 flex items-center gap-3`}>
        <div className="text-white/80">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-base">{version} — {title}</h3>
            {isLatest && (
              <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full">НОВОЕ</span>
            )}
          </div>
          <p className={`text-sm ${colors.headerText}`}>{date}</p>
        </div>
      </div>
      <div className="p-4 bg-white">{children}</div>
    </div>
  );
};

const ChangeItem: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-3 last:mb-0">
    <p className="font-semibold text-slate-800 text-sm mb-1">{title}</p>
    <div className="text-sm text-slate-600">{children}</div>
  </div>
);

const Updates: React.FC = () => {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Megaphone className="text-purple-600" />
          Обновления системы
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Полная история изменений MetalTrack Pro. Новые функции, улучшения, исправления.
        </p>
      </div>

      <div className="space-y-4">

        {/* v2.5 */}
        <UpdateCard
          version="v2.5"
          date="15 марта 2026"
          title="Погонные метры и галочка погрузки"
          color="purple"
          icon={<Ruler size={20} />}
          isLatest
        >
          <ChangeItem title="Движение металла — новые поля">
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Погонные метры</strong> — новое поле рядом с весом. Указывается опционально, удобно для учёта труб по метражу.</li>
              <li><strong>Галочка «Погр./разгр. работы»</strong> — если отмечено, появляется поле с авторасчётом (1000 ₽ × вес). Если не отмечено — стоимость погрузки = 0.</li>
            </ul>
          </ChangeItem>
          <ChangeItem title="Компактная таблица">
            <ul className="list-disc list-inside space-y-0.5">
              <li>Сужена колонка «Поставщик/Покупатель» → «Пост./Пок.»</li>
              <li>Уменьшены отступы — больше данных помещается на экран</li>
              <li>Добавлена колонка «Метры» в таблице</li>
            </ul>
          </ChangeItem>
        </UpdateCard>

        {/* v2.4 */}
        <UpdateCard
          version="v2.4"
          date="15 марта 2026"
          title="Упрощение интерфейса"
          color="green"
          icon={<Sparkles size={20} />}
        >
          <ChangeItem title="Движение металла">
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Убрана колонка «Владение»</strong> — лишняя информация, и так понятно чей металл по компании.</li>
            </ul>
          </ChangeItem>
          <ChangeItem title="Остатки на складе">
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Колонка «Владение» заменена на «Компания»</strong> — теперь показывается название компании (например, Энергоинвест) вместо «Клиента».</li>
              <li>Группировка в сводном режиме теперь по: материал + размер + компания.</li>
            </ul>
          </ChangeItem>
        </UpdateCard>

        {/* v2.3 */}
        <UpdateCard
          version="v2.3"
          date="15 марта 2026"
          title="Поставщик, Покупатель, Куда"
          color="slate"
          icon={<Package size={20} />}
        >
          <ChangeItem title="Новые поля в движении металла">
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Поставщик</strong> — у кого купили металл (только для прихода). Выбирается из справочника компаний с типом «Поставщик».</li>
              <li><strong>Покупатель</strong> — кому продали металл (только для расхода). Выбирается из справочника компаний с типом «Покупатель».</li>
              <li><strong>Куда (место хранения)</strong> — куда поехал товар. Свободный текст: «Кулаково», «транзит», «на Радем» и т.д.</li>
            </ul>
          </ChangeItem>
          <ChangeItem title="Авторасчёт погрузки/разгрузки">
            <p>При вводе веса автоматически считается стоимость погр./разгр. по формуле: <strong>1000 ₽ × вес в тоннах</strong>. Можно исправить вручную, если ставка другая.</p>
          </ChangeItem>
          <ChangeItem title="Расширенные таблицы">
            <p>Таблицы теперь занимают всю ширину экрана. Убраны лишние отступы по бокам — больше места для данных.</p>
          </ChangeItem>
          <ChangeItem title="Исправлен баг">
            <p>При нажатии «Сохранить» в форме движения больше не появляется ошибочный диалог «Закрыть без сохранения».</p>
          </ChangeItem>
        </UpdateCard>

        {/* v2.2 */}
        <UpdateCard
          version="v2.2"
          date="10 марта 2026"
          title="Деньги: журнал платежей"
          color="blue"
          icon={<Banknote size={20} />}
        >
          <ChangeItem title="Раздел «Деньги» — три вкладки">
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Сводка</strong> — карточки с итогами, таблица по компаниям и график расходов по категориям.</li>
              <li><strong>Приход</strong> — детальный журнал денежных поступлений: дата, сумма, нал/безнал, плательщик, получатель, примечание.</li>
              <li><strong>Расход</strong> — детальный журнал денежных выплат: закупки металла + все расходы (транспорт, аренда, погрузка и т.д.). Колонка «Статус» показывает оплачен ли расход.</li>
            </ul>
          </ChangeItem>
          <div className="bg-slate-50 rounded-lg p-3 mt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Как работает</p>
            <p className="text-sm text-slate-600">Данные берутся из уже введённых движений и расходов — ничего вводить дополнительно не нужно. Приход = продажи металла. Расход = закупки металла + все записи из раздела «Расходы». В каждой таблице есть итоговая сумма.</p>
          </div>
        </UpdateCard>

        {/* v2.1 */}
        <UpdateCard
          version="v2.1"
          date="5 марта 2026"
          title="Оплата, редактирование, быстрота"
          color="slate"
          icon={<Edit3 size={20} />}
        >
          <ChangeItem title="Движение металла">
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Способ оплаты</strong> — при создании движения выбирается «Нал» или «Безнал». Отображается в таблице.</li>
              <li><strong>Редактирование</strong> — кнопка карандаша у каждой записи. Можно изменить дату, операцию, вес, цену, примечание и способ оплаты.</li>
            </ul>
          </ChangeItem>
          <ChangeItem title="Расходы">
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Редактирование</strong> — кнопка карандаша, можно менять все поля расхода.</li>
              <li><strong>Статус оплаты</strong> — «Оплачено» / «Не оплачено» с цветными пометками в таблице (зелёный / красный).</li>
            </ul>
          </ChangeItem>
          <ChangeItem title="Удобство работы">
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Защита данных</strong> — при закрытии формы с несохранёнными данными появляется подтверждение.</li>
              <li><strong>Быстрее загрузка</strong> — интерфейс открывается мгновенно, данные догружаются в фоне.</li>
            </ul>
          </ChangeItem>
        </UpdateCard>

        {/* v2.0 */}
        <UpdateCard
          version="v2.0"
          date="1 марта 2026"
          title="Запуск MetalTrack Pro"
          color="amber"
          icon={<Rocket size={20} />}
        >
          <ChangeItem title="Первый релиз системы учёта металла">
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Движение металла</strong> — учёт прихода и расхода с ценами, весом, датами</li>
              <li><strong>Автоматические остатки</strong> — баланс считается автоматически по всем движениям</li>
              <li><strong>Справочники</strong> — компании (поставщики/покупатели), материалы, тарифы на работы</li>
              <li><strong>Расходы</strong> — транспорт, погрузка, аренда, зарплата и прочее</li>
              <li><strong>Работы</strong> — учёт услуг по тарифам (резка, сварка и т.д.)</li>
              <li><strong>Финансовая сводка</strong> — закупки, продажи, расходы, прибыль</li>
              <li><strong>История изменений</strong> — полный аудит всех операций (для админа)</li>
              <li><strong>Роли</strong> — админ (полный доступ) и оператор (ограниченный)</li>
              <li><strong>Мобильная версия</strong> — адаптивный интерфейс для телефонов</li>
            </ul>
          </ChangeItem>
        </UpdateCard>

      </div>

      <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
        <p><strong>Есть идеи или нашли баг?</strong> Напишите администратору — добавим в следующее обновление.</p>
      </div>
    </div>
  );
};

export default Updates;
