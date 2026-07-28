export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: Pagination;
}

export type UserRole = "user" | "expert" | "admin";
export type ExpertStatus = "online" | "offline" | "busy";
export type CallStatus =
  | "ringing"
  | "active"
  | "completed"
  | "missed"
  | "rejected"
  | "failed";
export type TransactionType =
  | "recharge"
  | "deduction"
  | "refund"
  | "payout"
  | "adjustment";
export type TransactionStatus = "pending" | "completed" | "failed";
export type PayoutStatus = "pending" | "processing" | "completed" | "failed";
export type ReportStatus = "pending" | "reviewed" | "resolved";
export type BannerPosition = "home" | "expert_list" | "community";

export interface User {
  _id: string;
  name: string;
  /** Private legal / signup name — admin can see both real + display */
  realName?: string;
  dob?: string;
  phone?: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  gender?: string;
  country?: string;
  city?: string;
  state?: string;
  isVerified?: boolean;
  isBlocked?: boolean;
  walletBalance?: number;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
}

export interface BankDetails {
  accountName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  upiId?: string;
}

export interface Expert {
  _id: string;
  userId: User | string;
  mobile?: string;
  bio?: string;
  experience?: number;
  categories?: Category[] | string[];
  languages?: string[];
  pricePerMinute: number;
  commissionPercent?: number;
  rating?: number;
  totalRatings?: number;
  totalCalls?: number;
  totalMinutes?: number;
  totalEarnings?: number;
  status?: ExpertStatus;
  bankDetails?: BankDetails;
  isVerified?: boolean;
  isApproved?: boolean;
  rejectionReason?: string;
  createdAt?: string;
}

export interface Call {
  _id: string;
  userId: string | User;
  expertId: string | Expert;
  status: CallStatus;
  durationSeconds: number;
  totalCost: number;
  pricePerMinute: number;
  agoraChannelName?: string;
  recordingUrl?: string;
  endReason?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface Transaction {
  _id: string;
  userId: string | User;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string;
  referenceType?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  description?: string;
  status: TransactionStatus;
  createdAt: string;
}

export interface Payout {
  _id: string;
  expertId: string | Expert;
  amount: number;
  commission: number;
  netAmount: number;
  periodStart?: string;
  periodEnd?: string;
  status: PayoutStatus;
  razorpayPayoutId?: string;
  processedAt?: string;
  createdAt: string;
}

export interface CommunityQuestion {
  _id: string;
  authorName?: string;
  isAnonymous?: boolean;
  title?: string;
  body?: string;
  category?: string | Category;
  tags?: string[];
  likesCount?: number;
  commentsCount?: number;
  isDeleted?: boolean;
  isFlagged?: boolean;
  isModerated?: boolean;
  createdAt: string;
}

export interface ModerationResult {
  isFlagged: boolean;
  reason?: string;
  confidence: number;
}

export interface CommissionReport {
  period: "week" | "month" | "year";
  totalCalls: number;
  grossRevenue: number;
  platformCommission: number;
  expertEarnings: number;
  payoutsPaid: number;
  payoutCount: number;
  refundsTotal: number;
  refundCount: number;
}

export interface Report {
  _id: string;
  reporterId?: string | User;
  targetType: "question" | "comment" | "user" | "expert";
  targetId: string;
  reason: string;
  description?: string;
  status: ReportStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  action?: string;
  createdAt: string;
}

export interface Faq {
  _id: string;
  question: string;
  answer: string;
  category?: string;
  isActive?: boolean;
  order?: number;
  createdAt?: string;
}

export interface Banner {
  _id: string;
  title: string;
  imageUrl: string;
  videoUrl?: string;
  mediaType?: "image" | "video";
  link?: string;
  tagline?: string;
  badge?: string;
  position: BannerPosition;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  order?: number;
  createdAt?: string;
}

export interface Coupon {
  _id: string;
  code: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  minAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount?: number;
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface DashboardMetrics {
  totalUsers: number;
  totalExperts: number;
  onlineExperts: number;
  activeCalls: number;
  totalRevenue: number;
  pendingReports: number;
  pendingExpertApprovals: number;
}

export interface AnalyticsBucket {
  _id: string;
  count?: number;
  amount?: number;
  revenue?: number;
  total?: number;
}

export interface AnalyticsData {
  userSignups: AnalyticsBucket[];
  recharges: AnalyticsBucket[];
  calls: AnalyticsBucket[];
  revenue: AnalyticsBucket[];
  period: "week" | "month" | "year";
}

export interface PlatformSettings {
  [key: string]: string;
}
