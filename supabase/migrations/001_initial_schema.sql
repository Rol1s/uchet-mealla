-- ============================================================
-- MetalTrack Pro: Initial schema + RLS + triggers
-- Run in Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. USERS (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. COMPANIES
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'both' CHECK (type IN ('supplier', 'buyer', 'both')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MATERIALS
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SERVICE_RATES
CREATE TABLE IF NOT EXISTS public.service_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'шт',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. POSITIONS
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  ownership TEXT NOT NULL DEFAULT 'own' CHECK (ownership IN ('own', 'client_storage')),
  balance DECIMAL(12, 3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, material_id, size, ownership)
);

-- 6. MOVEMENTS
CREATE TABLE IF NOT EXISTS public.movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('income', 'expense')),
  weight DECIMAL(12, 3) NOT NULL,
  cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  note TEXT,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. WORK_LOGS
CREATE TABLE IF NOT EXISTS public.work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id),
  service_id UUID NOT NULL REFERENCES public.service_rates(id) ON DELETE CASCADE,
  quantity DECIMAL(12, 3) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  note TEXT,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. AUDIT_LOG
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_positions_company ON public.positions(company_id);
CREATE INDEX IF NOT EXISTS idx_positions_material ON public.positions(material_id);
CREATE INDEX IF NOT EXISTS idx_movements_position ON public.movements(position_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON public.movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_work_logs_company ON public.work_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_date ON public.work_logs(work_date);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON public.audit_log(record_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users: read own row, insert own row
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_self" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_self" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Companies: all authenticated can read; insert/update/delete for all (simplified - can tighten by role in app)
CREATE POLICY "companies_all" ON public.companies FOR ALL USING (auth.role() = 'authenticated');

-- Materials: same
CREATE POLICY "materials_all" ON public.materials FOR ALL USING (auth.role() = 'authenticated');

-- Service rates: same
CREATE POLICY "service_rates_all" ON public.service_rates FOR ALL USING (auth.role() = 'authenticated');

-- Positions: same (needed for movements)
CREATE POLICY "positions_all" ON public.positions FOR ALL USING (auth.role() = 'authenticated');

-- Movements: all authenticated (operator: own delete; admin: any - can be enforced in app)
CREATE POLICY "movements_all" ON public.movements FOR ALL USING (auth.role() = 'authenticated');

-- Work logs: same
CREATE POLICY "work_logs_all" ON public.work_logs FOR ALL USING (auth.role() = 'authenticated');

-- Audit: only read for authenticated (admin-only view in app)
CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT WITH CHECK (true);

-- ============================================================
-- TRIGGER: sync auth.users -> public.users
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'operator')
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = COALESCE(EXCLUDED.name, public.users.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing auth users into public.users
INSERT INTO public.users (id, email, name, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'name', email), COALESCE(raw_user_meta_data->>'role', 'operator')
FROM auth.users
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = COALESCE(EXCLUDED.name, public.users.name);

-- ============================================================
-- TRIGGER: audit_log on main tables
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'insert', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, user_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit to tables
DROP TRIGGER IF EXISTS audit_movements ON public.movements;
CREATE TRIGGER audit_movements AFTER INSERT OR UPDATE OR DELETE ON public.movements FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_work_logs ON public.work_logs;
CREATE TRIGGER audit_work_logs AFTER INSERT OR UPDATE OR DELETE ON public.work_logs FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_positions ON public.positions;
CREATE TRIGGER audit_positions AFTER INSERT OR UPDATE OR DELETE ON public.positions FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_companies ON public.companies;
CREATE TRIGGER audit_companies AFTER INSERT OR UPDATE OR DELETE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_materials ON public.materials;
CREATE TRIGGER audit_materials AFTER INSERT OR UPDATE OR DELETE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_service_rates ON public.service_rates;
CREATE TRIGGER audit_service_rates AFTER INSERT OR UPDATE OR DELETE ON public.service_rates FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- ============================================================
-- TRIGGER: update position balance on movement insert/delete
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_position_balance_on_movement()
RETURNS TRIGGER AS $$
DECLARE
  delta DECIMAL(12, 3);
BEGIN
  IF TG_OP = 'INSERT' THEN
    delta := CASE WHEN NEW.operation = 'income' THEN NEW.weight ELSE -NEW.weight END;
    UPDATE public.positions SET balance = balance + delta, updated_at = NOW() WHERE id = NEW.position_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    delta := CASE WHEN OLD.operation = 'income' THEN -OLD.weight ELSE OLD.weight END;
    UPDATE public.positions SET balance = balance + delta, updated_at = NOW() WHERE id = OLD.position_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_position_balance_on_movement ON public.movements;
CREATE TRIGGER trigger_position_balance_on_movement
  AFTER INSERT OR DELETE ON public.movements
  FOR EACH ROW EXECUTE FUNCTION public.update_position_balance_on_movement();
