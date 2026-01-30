import { createClient } from '@supabase/supabase-js';
import type {
  User,
  Company,
  Material,
  ServiceRate,
  Position,
  Movement,
  WorkLog,
  AuditLog,
  MovementInput,
  WorkLogInput,
  OwnershipType,
  OperationType,
} from '../types';

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gbgfezeaaawfwhhlocsz.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === Auth Functions ===

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.id) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('getCurrentUser error:', err);
    return null;
  }
}

// === Companies ===

export async function getCompanies(activeOnly = true): Promise<Company[]> {
  let query = supabase.from('companies').select('*').order('name');
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createCompany(company: Omit<Company, 'id' | 'created_at' | 'created_by'>): Promise<Company> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('companies')
    .insert({ ...company, created_by: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCompany(id: string): Promise<void> {
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw error;
}

// === Materials ===

export async function getMaterials(activeOnly = true): Promise<Material[]> {
  let query = supabase.from('materials').select('*').order('name');
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createMaterial(material: Omit<Material, 'id' | 'created_at'>): Promise<Material> {
  const { data, error } = await supabase
    .from('materials')
    .insert(material)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
  const { data, error } = await supabase
    .from('materials')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMaterial(id: string): Promise<void> {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) throw error;
}

// === Service Rates ===

export async function getServiceRates(activeOnly = true): Promise<ServiceRate[]> {
  let query = supabase.from('service_rates').select('*').order('name');
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createServiceRate(rate: Omit<ServiceRate, 'id' | 'created_at'>): Promise<ServiceRate> {
  const { data, error } = await supabase
    .from('service_rates')
    .insert(rate)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateServiceRate(id: string, updates: Partial<ServiceRate>): Promise<ServiceRate> {
  const { data, error } = await supabase
    .from('service_rates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteServiceRate(id: string): Promise<void> {
  const { error } = await supabase.from('service_rates').delete().eq('id', id);
  if (error) throw error;
}

// === Positions ===

export async function getPositions(): Promise<Position[]> {
  const { data, error } = await supabase
    .from('positions')
    .select(`
      *,
      company:companies(*),
      material:materials(*)
    `)
    .order('updated_at', { ascending: false });
  if (error) throw error;
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

  if (existing) return existing;

  // Create new position if not found
  if (findError && findError.code === 'PGRST116') {
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
    if (createError) throw createError;
    return newPosition;
  }

  if (findError) throw findError;
  return existing!;
}

export async function getPositionBalance(positionId: string): Promise<number> {
  const { data, error } = await supabase
    .from('positions')
    .select('balance')
    .eq('id', positionId)
    .single();
  if (error) throw error;
  return data?.balance || 0;
}

// === Movements ===

export async function getMovements(): Promise<Movement[]> {
  const { data, error } = await supabase
    .from('movements')
    .select(`
      *,
      position:positions(
        *,
        company:companies(*),
        material:materials(*)
      )
    `)
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
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
  const { data: { user } } = await supabase.auth.getUser();
  const { data: movement, error: movementError } = await supabase
    .from('movements')
    .insert({
      position_id: position.id,
      operation: input.operation,
      weight: input.weight,
      cost: input.cost,
      note: input.note || null,
      movement_date: input.movement_date,
      created_by: user?.id,
    })
    .select(`
      *,
      position:positions(
        *,
        company:companies(*),
        material:materials(*)
      )
    `)
    .single();

  if (movementError) throw movementError;

  // Balance is updated by DB trigger update_position_balance_on_movement
  return movement;
}

export async function deleteMovement(id: string): Promise<void> {
  const { error } = await supabase.from('movements').delete().eq('id', id);
  if (error) throw error;
  // Balance reverted by DB trigger update_position_balance_on_movement
}

export async function updateMovement(
  id: string, 
  updates: Partial<Movement>
): Promise<Movement> {
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
      )
    `)
    .single();
  if (error) throw error;
  return data;
}

// === Work Logs ===

export async function getWorkLogs(): Promise<WorkLog[]> {
  const { data, error } = await supabase
    .from('work_logs')
    .select(`
      *,
      company:companies(*),
      material:materials(*),
      service:service_rates(*)
    `)
    .order('work_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createWorkLog(input: WorkLogInput, servicePrice: number): Promise<WorkLog> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('work_logs')
    .insert({
      company_id: input.company_id,
      material_id: input.material_id || null,
      service_id: input.service_id,
      quantity: input.quantity,
      total_price: input.quantity * servicePrice,
      note: input.note || null,
      work_date: input.work_date,
      created_by: user?.id,
    })
    .select(`
      *,
      company:companies(*),
      material:materials(*),
      service:service_rates(*)
    `)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorkLog(id: string): Promise<void> {
  const { error } = await supabase.from('work_logs').delete().eq('id', id);
  if (error) throw error;
}

export async function updateWorkLog(id: string, updates: Partial<WorkLog>): Promise<WorkLog> {
  const { data, error } = await supabase
    .from('work_logs')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      company:companies(*),
      material:materials(*),
      service:service_rates(*)
    `)
    .single();
  if (error) throw error;
  return data;
}

// === Audit Log ===

export async function getAuditLogs(limit = 100): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select(`
      *,
      user:users(*)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
