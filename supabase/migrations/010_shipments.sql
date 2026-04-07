-- Migration 010: Shipments table + shipment_id on movements
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  operation text NOT NULL DEFAULT 'income' CHECK (operation IN ('income', 'expense')),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  supplier_id uuid REFERENCES public.companies(id),
  buyer_id uuid REFERENCES public.companies(id),
  shipment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text DEFAULT 'cashless',
  destination text,
  note text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS shipment_id uuid
  REFERENCES public.shipments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movements_shipment_id ON public.movements(shipment_id);

COMMENT ON TABLE public.shipments IS 'Grouped deliveries (one truck = one shipment with multiple movements)';
