-- Migration 009: Add wall_thickness and quantity to movements
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS wall_thickness numeric;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS quantity integer;

COMMENT ON COLUMN public.movements.wall_thickness IS 'Wall thickness in mm (optional)';
COMMENT ON COLUMN public.movements.quantity IS 'Number of pieces (optional)';
