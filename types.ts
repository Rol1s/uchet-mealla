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
export type PaymentMethodType = 'cash' | 'cashless';

export interface Movement {
  id: string;
  position_id: string;
  shipment_id: string | null;
  operation: OperationType;
  weight: number;
  linear_meters: number | null;
  wall_thickness: number | null;
  quantity: number | null;
  cost: number;
  price_per_ton: number;
  total_value: number;
  payment_method: PaymentMethodType;
  supplier_id: string | null;
  buyer_id: string | null;
  destination: string | null;
  note: string | null;
  movement_date: string;
  created_by: string | null;
  created_at: string;
  // Joined fields
  position?: Position;
  supplier?: Company;
  buyer?: Company;
}

// === Shipment ===
export interface Shipment {
  id: string;
  operation: OperationType;
  company_id: string;
  supplier_id: string | null;
  buyer_id: string | null;
  shipment_date: string;
  payment_method: PaymentMethodType;
  destination: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  // Joined fields
  company?: Company;
  supplier?: Company;
  buyer?: Company;
  items?: Movement[];
}

export interface ShipmentItemInput {
  material_id: string;
  size: string;
  wall_thickness: number;
  quantity: number;
  linear_meters: number;
  weight: number;
  price_per_ton: number;
  note: string;
}

export interface ShipmentInput {
  operation: OperationType;
  company_id: string;
  supplier_id: string;
  buyer_id: string;
  shipment_date: string;
  payment_method: PaymentMethodType;
  destination: string;
  note: string;
  items: ShipmentItemInput[];
}

// === Expense ===
export type PaymentStatusType = 'paid' | 'unpaid';

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

export type ExpenseCategory = 'transport' | 'loading' | 'processing' | 'rent_salary' | 'other';
export type FinanceOperationType = 'income' | 'expense';

export interface Expense {
  id: string;
  expense_date: string;
  operation_type: FinanceOperationType;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method: PaymentMethodType;
  payment_status: PaymentStatusType;
  payer_id: string | null;
  recipient_id: string | null;
  company_id: string | null;
  movement_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  // Joined fields
  company?: Company;
  payer?: Company;
  recipient?: Company;
  movement?: Movement;
}

// === Form Input Types ===
export interface MovementInput {
  company_id: string;
  material_id: string;
  size: string;
  ownership: OwnershipType;
  operation: OperationType;
  weight: number;
  linear_meters: number;
  wall_thickness: number;
  quantity: number;
  cost: number;
  price_per_ton: number;
  payment_method: PaymentMethodType;
  supplier_id: string;
  buyer_id: string;
  destination: string;
  note: string;
  movement_date: string;
}

export interface ExpenseInput {
  expense_date: string;
  operation_type: FinanceOperationType;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method: PaymentMethodType;
  payment_status: PaymentStatusType;
  payer_id: string | null;
  recipient_id: string | null;
  company_id: string | null;
  movement_id: string | null;
  note: string;
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
