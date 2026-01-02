/**
 * Proofround Packet Storage - Data Minimization Module
 * 
 * This module provides all utilities for generating, storing, and accessing
 * Proofround packets with strict data minimization enforcement.
 */

// Types
export type {
  ProofroundPacket,
  RevenueMetrics,
  ChurnMetrics,
  CustomerConcentration,
  PayoutReconciliation,
  AnomalyFlags,
  StripeObjectReferences,
  MetricDefinitions,
  AuditMetadata,
  TimeSeriesPoint,
} from '../packet-types';

export {
  isRawStripeObject,
  validatePacketMinimization,
} from '../packet-types';

// Packet generation
export {
  generatePacket,
  type PacketGenerationConfig,
} from '../packet-generator';

// Storage
export {
  savePacket,
  recordPacketView,
  PacketStorageError,
  type PacketStorage,
  InMemoryPacketStorage,
} from '../packet-storage';

// Drill-down
export {
  fetchCustomerDrillDown,
  fetchChargeDrillDown,
  fetchInvoiceDrillDown,
  fetchSubscriptionDrillDown,
  fetchMultipleCustomers,
  fetchMultipleCharges,
  isDrillDownData,
  validateNoDrillDownStorage,
  type DrillDownContext,
  type CustomerDrillDown,
  type ChargeDrillDown,
  type InvoiceDrillDown,
  type SubscriptionDrillDown,
  type StripeClient,
} from '../packet-drilldown';

