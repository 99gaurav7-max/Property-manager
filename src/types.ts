export type UserRole = 'admin' | 'owner';

export type UserStatus = 'pending' | 'active' | 'suspended';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  statusReason?: string;
  createdAt: string;
  businessName?: string;
  phone?: string;
  currency?: string;
}

export interface Property {
  id: string;
  ownerId: string;
  title: string;
  location: string;
  rooms: number;
  bhk: number;
  rent: number;
  status: 'available' | 'occupied';
  terms: string;
  details?: string;
  roomList?: { name: string; rent: number; bhk?: string }[];
  amenities?: string[];
}

export interface Tenant {
  id: string;
  ownerId: string;
  name: string;
  email: string;
  phone: string;
  nid?: string; // National ID or passport
  status: 'active' | 'inactive';
  joinedAt: string;
}

export interface Allocation {
  id: string;
  ownerId: string;
  tenantId: string;
  propertyId: string;
  roomNo: string;
  rentOverride?: number;
  active: boolean;
  startDate: string;
  endDate?: string;
}

export interface Invoice {
  id: string;
  ownerId: string;
  tenantId: string;
  propertyId: string;
  allocationId: string;
  invoiceNumber: string;
  month: string; // e.g. "2026-07"
  amount: number;
  status: 'pending' | 'completed';
  dueDate: string;
  paidDate?: string;
  billingPeriod: string;
}

export interface Transaction {
  id: string;
  ownerId: string;
  tenantId?: string;
  propertyId?: string;
  invoiceId?: string;
  type: 'credit' | 'debit';
  category: string; // "Rent Income", "Maintenance", "Tax", "Utility", "Other"
  amount: number;
  date: string;
  description: string;
  referenceNo?: string;
  billType?: 'Room Rent' | 'Water Bill' | 'Electricity Bill' | 'Other Bill';
  monthYear?: string;
  roomNo?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
}
