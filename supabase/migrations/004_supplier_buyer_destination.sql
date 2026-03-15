-- ============================================================
-- MetalTrack Pro: Поставщик, Покупатель, Место хранения
-- ============================================================

-- 1. Добавляем поля в movements
ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination TEXT;

-- 2. Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_movements_supplier ON public.movements(supplier_id);
CREATE INDEX IF NOT EXISTS idx_movements_buyer ON public.movements(buyer_id);

-- 3. Комментарии для документации
COMMENT ON COLUMN public.movements.supplier_id IS 'Поставщик (у кого купили) - для операции income';
COMMENT ON COLUMN public.movements.buyer_id IS 'Покупатель (кому продали) - для операции expense';
COMMENT ON COLUMN public.movements.destination IS 'Место хранения / куда поехало (текст: Кулаково, транзит, и т.д.)';
