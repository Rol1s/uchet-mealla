-- Migration 008: Set payment_method = 'cashless' for all old records without explicit value
-- All existing records are considered cashless (as agreed with user)
UPDATE public.expenses
SET payment_method = 'cashless'
WHERE payment_method IS NULL OR payment_method = '';
