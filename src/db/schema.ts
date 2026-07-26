import { pgTable, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // User ID
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(), // 'admin' | 'owner'
  status: text('status').notNull(), // 'pending' | 'active' | 'suspended'
  statusReason: text('status_reason'),
  createdAt: text('created_at').notNull(),
  businessName: text('business_name'),
  phone: text('phone'),
  currency: text('currency'),
  password: text('password'), // Plain text or hashed password
});

export const properties = pgTable('properties', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  location: text('location').notNull(),
  rooms: integer('rooms').notNull(),
  bhk: integer('bhk').notNull(),
  rent: integer('rent').notNull(),
  status: text('status').notNull(), // 'available' | 'occupied'
  terms: text('terms').notNull(),
  details: text('details'),
  roomList: jsonb('room_list'),
  amenities: jsonb('amenities'),
});

export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  nid: text('nid'),
  status: text('status').notNull(), // 'active' | 'inactive'
  joinedAt: text('joined_at').notNull(),
});

export const allocations = pgTable('allocations', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  propertyId: text('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  roomNo: text('room_no').notNull(),
  rentOverride: integer('rent_override'),
  active: boolean('active').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
});

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  propertyId: text('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  allocationId: text('allocation_id').references(() => allocations.id, { onDelete: 'cascade' }).notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  month: text('month').notNull(), // e.g. "2026-07"
  amount: integer('amount').notNull(),
  status: text('status').notNull(), // 'pending' | 'completed'
  dueDate: text('due_date').notNull(),
  paidDate: text('paid_date'),
  billingPeriod: text('billing_period').notNull(),
});

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
  propertyId: text('property_id').references(() => properties.id, { onDelete: 'set null' }),
  invoiceId: text('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  type: text('type').notNull(), // 'credit' | 'debit'
  category: text('category').notNull(), // "Rent Income", "Maintenance", "Tax", "Utility", "Other"
  amount: integer('amount').notNull(),
  date: text('date').notNull(),
  description: text('description').notNull(),
  referenceNo: text('reference_no'),
  billType: text('bill_type'),
  monthYear: text('month_year'),
  roomNo: text('room_no'),
});

export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  userName: text('user_name').notNull(),
  userRole: text('user_role').notNull(),
  action: text('action').notNull(),
  details: text('details').notNull(),
  timestamp: text('timestamp').notNull(),
});
