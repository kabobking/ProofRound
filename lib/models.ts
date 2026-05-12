/**
 * Core data models for the ProofRound marketplace
 * Firestore-compatible TypeScript interfaces
 */

/**
 * User account with role-based access
 */
export interface User {
  id: string; // UID from Firebase Auth
  email: string;
  displayName: string;
  photoUrl?: string;
  role: 'founder' | 'investor' | 'admin';
  isAdmin: boolean; // Boolean flag for admin access
  company?: string;
  bio?: string;
  website?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  emailVerified: boolean;
}

/**
 * Startup/company profile
 */
export interface Startup {
  id: string; // Firestore doc ID
  name: string;
  description: string;
  tagline: string;
  founderId: string; // Reference to User
  founderEmail: string;
  industry: string;
  stage: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'growth' | 'mature';
  founded: string; // ISO date
  website?: string;
  logo?: string;
  location: string;
  team_size?: number;
  
  // Financial data
  financialMetrics?: {
    mrr?: number; // Monthly Recurring Revenue
    arr?: number; // Annual Recurring Revenue
    runway_months?: number;
    burn_rate?: number;
    last_updated?: string;
  };

  // Investment info
  seeking_amount?: number; // Amount seeking in this round (USD)
  valuation?: number; // Company valuation (USD)
  equity_offered?: number; // Percentage equity offered
  
  // Verification
  stripeAccountId?: string; // For packet verification
  verifiedFinancials: boolean;
  verificationPacketId?: string; // Reference to ProofroundPacket
  
  // Status
  visible: boolean; // Public on marketplace
  status: 'draft' | 'active' | 'seeking' | 'funded' | 'archived';
  
  // Metadata
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  views?: number;
  saved_by?: string[]; // User IDs who saved this startup
}

/**
 * Investment opportunity
 */
export interface InvestmentOpportunity {
  id: string;
  startupId: string; // Reference to Startup
  createdBy: string; // Founder user ID
  
  // Opportunity details
  type: 'equity' | 'debt' | 'revenue-share' | 'convertible';
  minimum_investment?: number; // USD
  maximum_investment?: number; // USD
  equity_percent?: number; // For equity investments
  interest_rate?: number; // For debt investments
  
  // Projections
  projections?: {
    year_1_revenue?: number;
    year_3_revenue?: number;
    year_5_revenue?: number;
    growth_rate?: number; // Percentage
    notes?: string;
  };

  // Timeline
  deadline?: string; // ISO date when round closes
  expected_close?: string; // ISO date for funding close
  
  // Description
  description: string;
  use_of_funds?: string;
  
  // Status
  status: 'draft' | 'active' | 'closed' | 'funded';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  interested_count?: number;
  views?: number;
}

/**
 * Investment interest from an investor
 */
export interface InvestmentInterest {
  id: string;
  opportunityId: string;
  investorId: string; // Investor user ID
  
  // Interest info
  amount?: number; // Amount interested in investing
  message?: string; // Note from investor
  
  // Status
  status: 'interested' | 'under-review' | 'contacted' | 'accepted' | 'declined';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * ProofRound Verification Packet (existing system)
 */
export interface ProofroundPacket {
  id: string;
  startupId?: string; // Link to startup
  stripeAccountId: string;
  generatedBy: string; // User ID who generated it
  
  // Time period
  timeRangeStart: string; // ISO date
  timeRangeEnd: string; // ISO date
  
  // Aggregated metrics (read-only access from Stripe)
  metrics: {
    mrr: number;
    arr: number;
    grossRevenue: number;
    netRevenue: number;
    refunds: number;
    chargebacks: number;
    monthlyBreakdown: Array<{ period: string; value: number }>;
    churnRate: number;
    activeCustomers: number;
    arpc: number; // Average revenue per customer
  };
  
  // References for drill-down (object IDs only, never raw objects)
  references: {
    customerIds: string[];
    chargeIds: string[];
    invoiceIds: string[];
    subscriptionIds: string[];
  };
  
  // Verification info
  verified: boolean;
  verificationHash: string; // For integrity checking
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  expiresAt: string; // Packets expire after 1 year
  views?: number;
}

/**
 * Admin activity log
 */
export interface AdminLog {
  id: string;
  adminId: string; // User ID of admin
  action: string; // 'verified_startup', 'flagged_content', etc
  targetId: string; // ID of resource affected
  targetType: 'startup' | 'investment' | 'packet' | 'user';
  details?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Type guards
 */
export function isFounder(user: User): boolean {
  return user.role === 'founder';
}

export function isInvestor(user: User): boolean {
  return user.role === 'investor';
}

export function isAdmin(user: User): boolean {
  return user.isAdmin || user.role === 'admin';
}

/**
 * Utility types for API responses
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
