-- Migration: Add movement_id link to expenses table
-- Allows linking financial records to specific movements

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS movement_id UUID REFERENCES public.movements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_movement ON public.expenses(movement_id);

COMMENT ON COLUMN public.expenses.movement_id IS 'Связь с движением металла (опционально)';
