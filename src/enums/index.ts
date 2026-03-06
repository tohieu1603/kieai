// -- User & Auth --
export enum UserRole {
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  VIEWER = 'viewer',
}

export enum TeamMemberStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  INACTIVE = 'inactive',
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

// -- Models & Marketplace --
export enum ModelCategory {
  VIDEO = 'video',
  IMAGE = 'image',
  MUSIC = 'music',
  CHAT = 'chat',
}

export enum PlaygroundFieldType {
  TEXTAREA = 'textarea',
  SELECT = 'select',
  TOGGLE = 'toggle',
  OPTIONS = 'options',
  FILE = 'file',
  NUMBER = 'number',
}

// -- Pricing --
export enum PricingCategory {
  CHAT = 'chat',
  VIDEO = 'video',
  IMAGE = 'image',
  MUSIC = 'music',
}

// -- Auth Provider --
export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  GITHUB = 'github',
}

// -- Subscription --
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PAST_DUE = 'past_due',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

// -- Transaction --
export enum TransactionType {
  CREDIT_PURCHASE = 'credit_purchase',
  SUBSCRIPTION = 'subscription',
  SEPAY_TOPUP = 'sepay_topup',
  REFUND = 'refund',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// -- Invoice --
export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

// -- Logs --
export enum LogStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PROCESSING = 'processing',
}

// -- API Docs --
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}
