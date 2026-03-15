import { ExpenseCategory } from '../types';

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  transport: 'Логистика',
  loading: 'Погрузка/Разгрузка',
  processing: 'Обработка',
  rent_salary: 'Аренда/Зарплата',
  other: 'Прочее',
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  transport: 'badge-blue',
  loading: 'badge-orange',
  processing: 'badge-green',
  rent_salary: 'badge-red',
  other: 'badge-gray',
};
