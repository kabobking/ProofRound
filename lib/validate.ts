/**
 * Basic email validation utility
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Basic email regex - conservative validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate waitlist form data
 */
export interface WaitlistFormData {
  email: string;
  role: string;
  company?: string;
  stage?: string;
  notes?: string;
}

export function validateWaitlistForm(data: WaitlistFormData): {
  valid: boolean;
  errors: Partial<Record<keyof WaitlistFormData, string>>;
} {
  const errors: Partial<Record<keyof WaitlistFormData, string>> = {};

  if (!data.email || !isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.role || data.role.trim() === '') {
    errors.role = 'Please select your role';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

