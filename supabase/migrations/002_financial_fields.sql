-- ============================================================
-- MetalTrack Pro: Financial fields + Expenses table
-- Run in Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Add price fields to movements
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS price_per_ton DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS total_value DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- 2. Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL CHECK (category IN ('transport', 'loading', 'processing', 'rent_salary', 'other')),
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  note TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_company ON public.expenses(company_id);

-- RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_all" ON public.expenses FOR ALL USING (auth.role() = 'authenticated');

-- Audit trigger (reuses existing audit_trigger_func)
DROP TRIGGER IF EXISTS audit_expenses ON public.expenses;
CREATE TRIGGER audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
