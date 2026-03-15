-- ============================================================
-- MetalTrack Pro: Расширение раздела Финансы
-- Добавляем: тип операции, способ оплаты, плательщик, получатель
-- ============================================================

-- 1. Добавляем новые поля в expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS operation_type TEXT DEFAULT 'expense' CHECK (operation_type IN ('income', 'expense')),
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cashless' CHECK (payment_method IN ('cash', 'cashless')),
  ADD COLUMN IF NOT EXISTS payer_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- 2. Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_expenses_operation_type ON public.expenses(operation_type);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_method ON public.expenses(payment_method);
CREATE INDEX IF NOT EXISTS idx_expenses_payer ON public.expenses(payer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_recipient ON public.expenses(recipient_id);

-- 3. Комментарии для документации
COMMENT ON COLUMN public.expenses.operation_type IS 'Тип операции: income (приход) / expense (расход)';
COMMENT ON COLUMN public.expenses.payment_method IS 'Способ оплаты: cash (нал) / cashless (безнал)';
COMMENT ON COLUMN public.expenses.payer_id IS 'Плательщик - кто платит';
COMMENT ON COLUMN public.expenses.recipient_id IS 'Получатель - кому платят';
