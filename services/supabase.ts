import { createClient } from '@supabase/supabase-js';
import { User, Company, Material, ServiceRate, Position, Movement, WorkLog, AuditLog, MovementInput, WorkLogInput, OwnershipType, Expense, ExpenseInput } from '../types';

// Supabase configuration — нормализуем URL (на случай дублирования в секретах)
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim() || 'https://gbgfezeaaawfwhhlocsz.supabase.co';
const SUPABASE_URL = rawUrl.includes('supabase.co')
  ? (rawUrl.match(/https?:\/\/[^/]+\.supabase\.co/)?.[0] ?? rawUrl)
  : rawUrl;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const isDev = import.meta.env.DEV;

if (isDev) {
  console.log('[Supabase] URL:', SUPABASE_URL);
  console.log('[Supabase] Key length:', SUPABASE_ANON_KEY?.length || 0);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
  db: {
    schema: 'public',
  },
  // Глобальные настройки повторных попыток
  global: {
    headers: { 'x-my-custom-header': 'metaltrack' },
  },
});

// === Auth Functions ===

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw normalizeDbError(error);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw normalizeDbError(error);
}

/** Один вызов getUser() для created_by — переиспользуем в create*. */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** PostgREST: запрос .single() вернул 0 или >1 строки. */
const PGRST_NO_SINGLE_ROW = 'PGRST116';

/** Превращает ошибку PostgREST/сети в человекочитаемое сообщение для UI. */
function normalizeDbError(err: unknown): Error {
  if (err instanceof Error) {
    const code = (err as { code?: string }).code;
    if (code === PGRST_NO_SINGLE_ROW) return new Error('Запись не найдена');
    if (code === '23505') return new Error('Такая запись уже существует');
    if (code === '23503') return new Error('Связанные данные не найдены');
    if (/timeout|network|failed to fetch|ERR_/i.test(err.message)) return new Error('Нет связи с сервером. Проверьте интернет.');
    return err;
  }
  return new Error('Ошибка при обращении к базе данных');
}

// === Companies ===

export async function getCompanies(activeOnly = true): Promise<Company[]> {
  let query = supabase.from('companies').select('*').order('name');
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw normalizeDbError(error);
  return data || [];
}

export async function createCompany(company: Omit<Company, 'id' | 'created_at' | 'created_by'>): Promise<Company> {
  const createdBy = await getCurrentUserId();
  const { data, error } = await supabase
    .from('companies')
    .insert({ ...company, created_by: createdBy })
    .select()
    .single();
  if (error) throw normalizeDbError(error);
  return data;
}

export async function updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw normalizeDbError(error);
  return data;
}

export async function deleteCompany(id: string): Promise<void> {
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw normalizeDbError(error);
}

// === Materials ===

export async function getMaterials(activeOnly = true): Promise<Material[]> {
  let query = supabase.from('materials').select('*').order('name');
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw normalizeDbError(error);
  return data || [];
}

export async function createMaterial(material: Omit<Material, 'id' | 'created_at'>): Promise<Material> {
  const { data, error } = await supabase
    .from('materials')
    .insert(material)
    .select()
    .single();
  if (error) throw normalizeDbError(error);
  return data;
}

export async function updateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
  const { data, error } = await supabase
    .from('materials')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw normalizeDbError(error);
  return data;
}

export async function deleteMaterial(id: string): Promise<void> {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) throw normalizeDbError(error);
}

// === Service Rates ===

export async function getServiceRates(activeOnly = true): Promise<ServiceRate[]> {
  let query = supabase.from('service_rates').select('*').order('name');
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw normalizeDbError(error);
  return data || [];
}

export async function createServiceRate(rate: Omit<ServiceRate, 'id' | 'created_at'>): Promise<ServiceRate> {
  const row = {
    name: rate.name,
    price: Number(rate.price) || 0,
    unit: rate.unit || 'шт',
    active: rate.active ?? true,
  };
  const { data, error } = await supabase
    .from('service_rates')
    .insert(row)
    .select()
    .single();
  if (error) throw normalizeDbError(error);
  return data;
}

export async function updateServiceRate(id: string, updates: Partial<ServiceRate>): Promise<ServiceRate> {
  const { data, error } = await supabase
    .from('service_rates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw normalizeDbError(error);
  return data;
}

export async function deleteServiceRate(id: string): Promise<void> {
  const { error } = await supabase.from('service_rates').delete().eq('id', id);
  if (error) throw normalizeDbError(error);
}

// === Positions & Inventory ===

export async function getPositions(): Promise<Position[]> {
  const { data, error } = await supabase
    .from('positions')
    .select(`
      *,
      company:companies(*),
      material:materials(*)
    `)
    .order('updated_at', { ascending: false });
  if (error) throw normalizeDbError(error);
  return data || [];
}

export async function findOrCreatePosition(
  companyId: string,
  materialId: string,
  size: string,
  ownership: OwnershipType
): Promise<Position> {
  // Try to find existing position
  const { data: existing, error: findError } = await supabase
    .from('positions')
    .select('*')
    .eq('company_id', companyId)
    .eq('material_id', materialId)
    .eq('size', size)
    .eq('ownership', ownership)
    .single();

  // Position found - return it
  if (existing) return existing;

  if (findError && findError.code === PGRST_NO_SINGLE_ROW) {
    // Create new position
    const { data: newPosition, error: createError } = await supabase
      .from('positions')
      .insert({
        company_id: companyId,
        material_id: materialId,
        size,
        ownership,
        balance: 0,
      })
      .select()
      .single();

    if (createError) throw normalizeDbError(createError);
    if (!newPosition) throw new Error('Failed to create position: no data returned');
    return newPosition;
  }

  // Other error occurred
  if (findError) throw normalizeDbError(findError);

  // Should never reach here, but throw if we do
  throw new Error('Unexpected state in findOrCreatePosition');
}

export async function getPositionBalance(positionId: string): Promise<number> {
  const { data, error } = await supabase
    .from('positions')
    .select('balance')
    .eq('id', positionId)
    .single();
  
  if (error) return 0;
  return data?.balance || 0;
}

// === Movements ===

export async function getMovements(): Promise<Movement[]> {
  const { data, error } = await supabase
    .from('movements')
    .select(`
      *,
      user:users(name, email),
      position:positions(
        *,
        company:companies(*),
        material:materials(*)
      ),
      supplier:companies!supplier_id(*),
      buyer:companies!buyer_id(*)
    `)
    .order('movement_date', { ascending: false });
  if (error) throw normalizeDbError(error);
  return data || [];
}

export async function createMovement(input: MovementInput): Promise<Movement> {
  // 1. Find or create position
  const position = await findOrCreatePosition(
    input.company_id,
    input.material_id,
    input.size,
    input.ownership
  );

  // 2. Insert movement
  const createdBy = await getCurrentUserId();
  const totalValue = input.weight * (input.price_per_ton || 0);
  const { data: movement, error: movementError } = await supabase
    .from('movements')
    .insert({
      position_id: position.id,
      operation: input.operation,
      weight: input.weight,
      linear_meters: input.linear_meters || null,
      cost: input.cost,
      price_per_ton: input.price_per_ton || 0,
      total_value: totalValue,
      payment_method: input.payment_method || 'cashless',
      supplier_id: input.supplier_id || null,
      buyer_id: input.buyer_id || null,
      destination: input.destination || null,
      note: input.note || null,
      movement_date: input.movement_date,
      created_by: createdBy,
    })
    .select(`
      *,
      position:positions(
        *,
        company:companies(*),
        material:materials(*)
      ),
      supplier:companies!supplier_id(*),
      buyer:companies!buyer_id(*)
    `)
    .single();

  if (movementError) throw normalizeDbError(movementError);

  // Balance is updated by DB trigger update_position_balance_on_movement
  return movement;
}

export type MovementUpdatePayload = Partial<Pick<Movement, 'movement_date' | 'operation' | 'weight' | 'linear_meters' | 'cost' | 'price_per_ton' | 'note' | 'payment_method' | 'supplier_id' | 'buyer_id' | 'destination'>>;

export async function updateMovement(id: string, payload: MovementUpdatePayload): Promise<Movement> {
  const updates: Record<string, unknown> = { ...payload };
  if (payload.weight != null && payload.price_per_ton != null) {
    updates.total_value = payload.weight * payload.price_per_ton;
  } else if (payload.weight != null || payload.price_per_ton != null) {
    const { data: current } = await supabase.from('movements').select('weight, price_per_ton').eq('id', id).single();
    const w = payload.weight ?? (current?.weight ?? 0);
    const p = payload.price_per_ton ?? (current?.price_per_ton ?? 0);
    updates.total_value = w * p;
  }
  const { data, error } = await supabase
    .from('movements')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      position:positions(
        *,
        company:companies(*),
        material:materials(*)
      ),
      supplier:companies!supplier_id(*),
      buyer:companies!buyer_id(*)
    `)
    .single();
  if (error) throw normalizeDbError(error);
  return data;
}

export async function deleteMovement(id: string): Promise<void> {
  const { error } = await supabase.from('movements').delete().eq('id', id);
  if (error) throw normalizeDbError(error);
}

// === Work Logs ===

export async function getWorkLogs(): Promise<WorkLog[]> {
  const { data, error } = await supabase
    .from('work_logs')
    .select(`
      *,
      user:users(name, email),
      company:companies(*),
      material:materials(*),
      service:service_rates(*)
    `)
    .order('work_date', { ascending: false });
  if (error) throw normalizeDbError(error);
  return data || [];
}

export async function createWorkLog(input: WorkLogInput, pricePerUnit: number): Promise<WorkLog> {
  const createdBy = await getCurrentUserId();
  const totalPrice = input.quantity * pricePerUnit;

  const { data, error } = await supabase
    .from('work_logs')
    .insert({
      company_id: input.company_id,
      material_id: input.material_id || null,
      service_id: input.service_id,
      quantity: input.quantity,
      total_price: totalPrice,
      note: input.note || null,
      work_date: input.work_date,
      created_by: createdBy,
    })
    .select(`
      *,
      company:companies(*),
      material:materials(*),
      service:service_rates(*)
    `)
    .single();

  if (error) throw normalizeDbError(error);
  return data;
}

export async function deleteWorkLog(id: string): Promise<void> {
  const { error } = await supabase.from('work_logs').delete().eq('id', id);
  if (error) throw normalizeDbError(error);
}

// === Expenses ===

export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      company:companies!company_id(*),
      payer:companies!payer_id(*),
      recipient:companies!recipient_id(*),
      user:users(name, email)
    `)
    .order('expense_date', { ascending: false });
  if (error) {
    console.error('getExpenses error:', error);
    throw normalizeDbError(error);
  }
  return data || [];
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const createdBy = await getCurrentUserId();
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      expense_date: input.expense_date,
      operation_type: input.operation_type || 'expense',
      category: input.category,
      description: input.description,
      amount: input.amount,
      payment_method: input.payment_method || 'cashless',
      payment_status: input.payment_status ?? 'unpaid',
      payer_id: input.payer_id || null,
      recipient_id: input.recipient_id || null,
      company_id: input.company_id || null,
      movement_id: input.movement_id || null,
      note: input.note || null,
      created_by: createdBy,
    })
    .select(`
      *,
      company:companies(*),
      payer:companies!payer_id(*),
      recipient:companies!recipient_id(*)
    `)
    .single();
  if (error) throw normalizeDbError(error);
  return data;
}

export async function updateExpense(id: string, updates: Partial<ExpenseInput>): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      company:companies(*),
      payer:companies!payer_id(*),
      recipient:companies!recipient_id(*)
    `)
    .single();
  if (error) throw normalizeDbError(error);
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw normalizeDbError(error);
}

// === Audit ===

export async function getAuditLogs(limit = 100): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select(`
      *,
      user:users(name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw normalizeDbError(error);
  return data || [];
}
