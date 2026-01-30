import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Shield, User, ChevronRight } from 'lucide-react';

const Help: React.FC = () => {
  const { isAdmin } = useAuth();

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="text-blue-600" />
          База знаний
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Руководство по работе с MetalTrack Pro
        </p>
      </div>

      {/* Кто такой оператор */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <User size={20} />
          Кто такой оператор?
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed mb-3">
          <strong>Оператор</strong> — это обычный пользователь системы: кладовщик, менеджер склада или сотрудник, 
          который ежедневно вносит приход/расход металла, фиксирует выполненные работы и смотрит остатки.
        </p>
        <ul className="list-disc list-inside text-slate-600 text-sm space-y-1 ml-2">
          <li>Вносит движения (приход/расход) и работы</li>
          <li>Просматривает остатки, справочники компаний и материалов</li>
          <li>Может удалять только <strong>свои</strong> записи (движения и работы)</li>
          <li>Не видит раздел «История изменений»</li>
          <li>Не может редактировать или удалять чужие записи</li>
        </ul>
      </section>

      {/* Руководство для оператора */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Руководство для оператора</h3>
        <div className="space-y-4 text-sm text-slate-600">
          <div>
            <h4 className="font-medium text-slate-700 flex items-center gap-2">
              <ChevronRight size={16} className="text-blue-500" />
              Главная
            </h4>
            <p className="ml-5 mt-1">Сводка: текущий остаток, приход, расход, сумма работ. График остатков по материалам.</p>
          </div>
          <div>
            <h4 className="font-medium text-slate-700 flex items-center gap-2">
              <ChevronRight size={16} className="text-blue-500" />
              Движение
            </h4>
            <p className="ml-5 mt-1">
              Добавление прихода или расхода: выберите компанию, материал, размер, укажите «Наш товар» или «На хранении у клиента», вес и дату. 
              При расходе система предупредит, если баланс станет отрицательным.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-slate-700 flex items-center gap-2">
              <ChevronRight size={16} className="text-blue-500" />
              Остатки
            </h4>
            <p className="ml-5 mt-1">
              Просмотр остатков. Можно включить «Разбить по компаниям» или «Сводно», отфильтровать по владению (наш / клиента). 
              Экспорт в CSV.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-slate-700 flex items-center gap-2">
              <ChevronRight size={16} className="text-blue-500" />
              Работы
            </h4>
            <p className="ml-5 mt-1">Учёт выполненных услуг: компания, вид работ (тариф), количество. Сумма считается автоматически.</p>
          </div>
          <div>
            <h4 className="font-medium text-slate-700 flex items-center gap-2">
              <ChevronRight size={16} className="text-blue-500" />
              Компании, Материалы, Тарифы
            </h4>
            <p className="ml-5 mt-1">Справочники для выбора при создании движений и работ. Редактирование и удаление — только у администратора.</p>
          </div>
        </div>
      </section>

      {/* Руководство для админа (только если админ) */}
      {isAdmin && (
        <section className="bg-slate-50 rounded-xl border-2 border-amber-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <Shield size={20} className="text-amber-600" />
            Руководство для администратора
          </h3>
          <div className="space-y-4 text-sm text-slate-600">
            <p className="font-medium text-slate-700">
              Администратор имеет полный доступ ко всем разделам и дополнительным возможностям:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>История</strong> — просмотр аудита: кто, когда и что изменил (таблица, запись, действие).</li>
              <li><strong>Редактирование справочников</strong> — компании, материалы, тарифы: добавление, изменение, удаление, переключение «Активна/Неактивна».</li>
              <li><strong>Удаление любых записей</strong> — движения и работы любых пользователей, не только свои.</li>
            </ul>
            <p className="text-slate-500 text-xs mt-2">
              Роль пользователя задаётся в Supabase Dashboard (Authentication → Users) или в метаданных при создании пользователя (поле <code className="bg-slate-200 px-1 rounded">role</code>: <code className="bg-slate-200 px-1 rounded">admin</code> или <code className="bg-slate-200 px-1 rounded">operator</code>).
            </p>
          </div>
        </section>
      )}

      {/* Общие понятия */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Важные понятия</h3>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-slate-700">Владение (ownership)</dt>
            <dd className="text-slate-600 ml-4">«Наш товар» — металл принадлежит компании; «На хранении у клиента» — металл клиента на вашем складе.</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Позиция</dt>
            <dd className="text-slate-600 ml-4">Уникальная комбинация: компания + материал + размер + владение. Остаток считается по позиции автоматически.</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Отрицательный баланс</dt>
            <dd className="text-slate-600 ml-4">При расходе, если остаток станет меньше нуля, система спросит подтверждение. Подтверждайте только при осознанном допуске минуса.</dd>
          </div>
        </dl>
      </section>
    </div>
  );
};

export default Help;
