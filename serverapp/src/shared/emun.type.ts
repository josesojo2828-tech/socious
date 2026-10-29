export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DELETED = "DELETED",
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  CANCELED = "CANCELED",
  EXPIRED = "EXPIRED",
}

export enum TransactionType {
  DEPOSIT = "DEPOSIT",
  WITHDRAW = "WITHDRAW",
  PAYMENT = "PAYMENT",
  REFUND = "REFUND",
}

export enum TransactionStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  CANCELED = "CANCELED",
}

export enum FileType {
  IMAGE = "IMAGE",
  DOCUMENT = "DOCUMENT",
  REPORT = "REPORT",
  RECEIPT = "RECEIPT",
  OTHER = "OTHER",
}

export enum FileStorage {
  LOCAL = "LOCAL",
  S3 = "S3",
  SUPABASE = "SUPABASE",
  GCS = "GCS",
}

export enum FileVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
  PROTECTED = "PROTECTED",
}

export enum AddressType {
  HOME = "HOME",
  OFFICE = "OFFICE",
  BILLING = "BILLING",
  SHIPPING = "SHIPPING",
  OTHER = "OTHER",
}
