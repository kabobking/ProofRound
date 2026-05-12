/**
 * Firebase Analytics tracking utilities
 */

import { trackEvent } from './firebase-client';

/**
 * Track user authentication events
 */
export const analyticsEvents = {
  // Auth events
  signup: (role: string) => trackEvent('user_signup', { role }),
  login: () => trackEvent('user_login'),
  logout: () => trackEvent('user_logout'),
  passwordReset: () => trackEvent('password_reset_requested'),
  
  // Marketplace events
  marketplace_view: () => trackEvent('marketplace_viewed'),
  startup_search: (query: string) => trackEvent('startup_search', { query }),
  startup_filter: (filterType: string) => trackEvent('startup_filter', { filter_type: filterType }),
  
  // Startup detail events
  startup_detail_view: (startupId: string) => trackEvent('startup_detail_viewed', { startup_id: startupId }),
  startup_opportunity_view: (opportunityId: string) => trackEvent('opportunity_viewed', { opportunity_id: opportunityId }),
  verified_packet_view: (packetId: string) => trackEvent('verified_packet_viewed', { packet_id: packetId }),
  
  // Investment events
  investment_interest_created: (opportunityId: string, amount: number) => 
    trackEvent('investment_interest_created', { opportunity_id: opportunityId, amount }),
  investment_interest_withdrawn: (interestId: string) => 
    trackEvent('investment_interest_withdrawn', { interest_id: interestId }),
  
  // Startup creation
  startup_created: (startupId: string) => trackEvent('startup_created', { startup_id: startupId }),
  startup_updated: (startupId: string) => trackEvent('startup_updated', { startup_id: startupId }),
  
  // Dashboard events
  dashboard_view: (role: string) => trackEvent('dashboard_viewed', { role }),
  
  // Stripe events
  stripe_payment_initiated: (amount: number) => trackEvent('stripe_payment_initiated', { amount }),
  stripe_payment_completed: (amount: number, opportunityId: string) => 
    trackEvent('stripe_payment_completed', { amount, opportunity_id: opportunityId }),
  
  // Error events
  api_error: (endpoint: string, statusCode: number) => 
    trackEvent('api_error', { endpoint, status_code: statusCode }),
};

export default analyticsEvents;
