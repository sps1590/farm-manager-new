// Roles are free text: a fixed set of presets (see RolePreset below) plus any
// custom label an owner types in. "owner" is reserved -- only the
// registration flow may create a user with this role; team-management code
// must never let an owner assign it to someone else.
export type Role = string;
export const RESERVED_OWNER_ROLE = "owner";
export type RolePreset = "owner" | "manager" | "employee";

export type Language = "en" | "bn";

export type Module = "batches" | "purchases" | "sales" | "medical";
export const MODULES: Module[] = ["batches", "purchases", "sales", "medical"];
export type PermAction = "view" | "create" | "edit" | "delete";
export type ModulePermissions = Record<PermAction, boolean>;
export type PermissionsMap = Record<Module, ModulePermissions>;

export function emptyPermissions(): PermissionsMap {
  return {
    batches: { view: false, create: false, edit: false, delete: false },
    purchases: { view: false, create: false, edit: false, delete: false },
    sales: { view: false, create: false, edit: false, delete: false },
    medical: { view: false, create: false, edit: false, delete: false },
  };
}

export interface FarmRow {
  id: number;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  profit_reserve_percent: number;
  created_at: string;
}

export type PartnerStatus = "active" | "inactive";

export interface UserRow {
  id: number;
  farm_id: number;
  username: string | null;
  email: string | null;
  phone: string | null;
  password_hash: string;
  name: string;
  role: Role;
  is_partner: boolean;
  profit_share_percent: number;
  profit_share_auto: boolean;
  partner_status: PartnerStatus;
  language: Language;
  created_at: string;
}

export interface SessionUser {
  id: number;
  farm_id: number;
  username: string | null;
  email: string | null;
  phone: string | null;
  name: string;
  role: Role;
  is_partner: boolean;
  profit_share_percent: number;
  language: Language;
  permissions: PermissionsMap;
}

export interface SpeciesRow {
  id: number;
  key: string;
  name_en: string;
  name_bn: string;
  unit_en: string;
  unit_bn: string;
  icon: string;
  sort_order: number;
}

export type BatchStatus = "active" | "closed";

export interface BatchRow {
  id: number;
  species_id: number;
  name: string;
  breed: string | null;
  source: string | null;
  acquired_date: string | null;
  initial_quantity: number;
  current_quantity: number;
  unit_cost: number | null;
  status: BatchStatus;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export type PurchaseCategory =
  | "animal"
  | "feed"
  | "medicine"
  | "utility"
  | "equipment"
  | "other";

export interface PurchaseRow {
  id: number;
  species_id: number | null;
  batch_id: number | null;
  category: PurchaseCategory;
  item_name: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  total_amount: number;
  purchase_date: string;
  vendor: string | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
}

export interface SaleRow {
  id: number;
  species_id: number | null;
  batch_id: number | null;
  item_name: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  total_amount: number;
  sale_date: string;
  buyer: string | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
}

export type MedicalRecordType =
  | "vaccination"
  | "treatment"
  | "checkup"
  | "mortality";

export interface MedicalRecordRow {
  id: number;
  species_id: number | null;
  batch_id: number | null;
  record_type: MedicalRecordType;
  title: string;
  event_date: string;
  next_due_date: string | null;
  quantity_affected: number | null;
  administered_by: string | null;
  cost: number | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
}

export interface TeamMemberRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  role: Role;
  permissions: PermissionsMap;
}

export type PartnerEntryType = "contribution" | "withdrawal";

export interface PartnerInvestmentRow {
  id: number;
  user_id: number;
  entry_type: PartnerEntryType;
  amount: number;
  entry_date: string;
  notes: string | null;
  created_by: number | null;
  created_at: string;
}

export interface PartnerSummary {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  netInvestment: number;
  ownershipPercent: number;
  profitSharePercent: number;
  profitShareAuto: boolean;
  profitShareAmount: number;
  status: PartnerStatus;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  totalPayroll: number;
  netProfit: number;
}

export interface EmployeeRow {
  id: number;
  name: string;
  phone: string | null;
  role_title: string | null;
  join_date: string | null;
  monthly_salary: number | null;
  housing_provided: number;
  status: "active" | "inactive";
  notes: string | null;
  created_at: string;
}

export type SalaryPaymentStatus = "pending" | "paid";

export interface SalaryPaymentRow {
  id: number;
  employee_id: number;
  amount: number;
  pay_period: string;
  paid_date: string | null;
  status: SalaryPaymentStatus;
  notes: string | null;
  created_by: number | null;
  created_at: string;
}
