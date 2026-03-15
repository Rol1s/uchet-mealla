-- ============================================================
-- MetalTrack Pro: Payment method (movements), Payment status (expenses)
-- ============================================================

-- 1. Movements: способ оплаты нал/безнал
ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cashless'
  CHECK (payment_method IN ('cash', 'cashless'));

-- 2. Expenses: статус оплачено/не оплачено
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'
  CHECK (payment_status IN ('paid', 'unpaid'));

-- 3. Balance trigger: support UPDATE (weight/operation change)
CREATE OR REPLACE FUNCTION public.update_position_balance_on_movement()
RETURNS TRIGGER AS $$
DECLARE
  delta DECIMAL(12, 3);
  old_delta DECIMAL(12, 3);
  new_delta DECIMAL(12, 3);
BEGIN
  IF TG_OP = 'INSERT' THEN
    delta := CASE WHEN NEW.operation = 'income' THEN NEW.weight ELSE -NEW.weight END;
    UPDATE public.positions SET balance = balance + delta, updated_at = NOW() WHERE id = NEW.position_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    delta := CASE WHEN OLD.operation = 'income' THEN -OLD.weight ELSE OLD.weight END;
    UPDATE public.positions SET balance = balance + delta, updated_at = NOW() WHERE id = OLD.position_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.position_id = NEW.position_id THEN
      old_delta := CASE WHEN OLD.operation = 'income' THEN OLD.weight ELSE -OLD.weight END;
      new_delta := CASE WHEN NEW.operation = 'income' THEN NEW.weight ELSE -NEW.weight END;
      delta := new_delta - old_delta;
      UPDATE public.positions SET balance = balance + delta, updated_at = NOW() WHERE id = NEW.position_id;
    ELSE
      old_delta := CASE WHEN OLD.operation = 'income' THEN OLD.weight ELSE -OLD.weight END;
      UPDATE public.positions SET balance = balance - old_delta, updated_at = NOW() WHERE id = OLD.position_id;
      new_delta := CASE WHEN NEW.operation = 'income' THEN NEW.weight ELSE -NEW.weight END;
      UPDATE public.positions SET balance = balance + new_delta, updated_at = NOW() WHERE id = NEW.position_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_position_balance_on_movement ON public.movements;
CREATE TRIGGER trigger_position_balance_on_movement
  AFTER INSERT OR DELETE OR UPDATE OF weight, operation, position_id ON public.movements
  FOR EACH ROW EXECUTE FUNCTION public.update_position_balance_on_movement();
