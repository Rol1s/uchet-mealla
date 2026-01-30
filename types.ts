// === Database Types ===

export type UserRole = 'admin' | 'operator';
export type OperationType = 'income' | 'expense';
export type CompanyType = 'supplier' | 'buyer' | 'both';
export type OwnershipType = 'own' | 'client_storage';
export type AuditAction = 'insert' | 'update' | 'delete';

// === User ===
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

// === Company ===
export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

// === Material ===
export interface Material {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

// === Service Rate ===
export interface ServiceRate {
  id: string;
  name: string;
  price: number;
  unit: string;
  active: boolean;
  created_at?: string;
}

// === Position (Inventory Position) ===
export interface Position {
  id: string;
  company_id: string;
  material_id: string;
  size: string;
  ownership: OwnershipType;
  balance: number;
  updated_at: string;
  // Joined fields
  company?: Company;
  material?: Material;
}

// === Movement ===
export interface Movement {
  id: string;
  position_id: string;
  operation: OperationType;
  weight: number;
  cost: number;
  note: string | null;
  movement_date: string;
  created_by: string | null;
  created_at: string;
  // Joined fields
  position?: Position;
}

// === Work Log ===
export interface WorkLog {
  id: string;
  company_id: string;
  material_id: string | null;
  service_id: string;
  quantity: number;
  total_price: number;
  note: string | null;
  work_date: string;
  created_by: string | null;
  created_at: string;
  // Joined fields
  company?: Company;
  material?: Material;
  service?: ServiceRate;
}

// === Audit Log ===
export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
  // Joined fields
  user?: User;
}

// === Inventory Item (calculated from positions) ===
export interface InventoryItem {
  id: string;
  company: string;
  company_id: string;
  material: string;
  material_id: string;
  size: string;
  ownership: OwnershipType;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

// === Form Input Types ===
export interface MovementInput {
  company_id: string;
  material_id: string;
  size: string;
  ownership: OwnershipType;
  operation: OperationType;
  weight: number;
  cost: number;
  note: string;
  movement_date: string;
}

export interface WorkLogInput {
  company_id: string;
  material_id: string | null;
  service_id: string;
  quantity: number;
  note: string;
  work_date: string;
}

// === Auth Types ===
export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}
