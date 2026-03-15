-- ============================================================
-- MetalTrack Pro: Погонные метры
-- ============================================================

-- 1. Добавляем поле linear_meters в movements
ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS linear_meters DECIMAL(12, 2);

-- 2. Комментарий для документации
COMMENT ON COLUMN public.movements.linear_meters IS 'Погонные метры (опционально)';
