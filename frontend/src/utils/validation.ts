/**
 * Validation rules for Quasar forms
 * Each validator returns true if valid, or an error message string if invalid
 */

type ValidationRule = (val: unknown) => boolean | string;

// Generic validators
export const required = (message = 'This field is required'): ValidationRule =>
  (val: unknown) => !!val || message;

export const minLength = (min: number, message?: string): ValidationRule =>
  (val: unknown) => {
    if (!val || typeof val !== 'string') return true;
    return val.length >= min || message || `Must be at least ${min} characters`;
  };

export const maxLength = (max: number, message?: string): ValidationRule =>
  (val: unknown) => {
    if (!val || typeof val !== 'string') return true;
    return val.length <= max || message || `Must be at most ${max} characters`;
  };

export const minValue = (min: number, message?: string): ValidationRule =>
  (val: unknown) => {
    if (val === null || val === undefined || val === '') return true;
    return Number(val) >= min || message || `Must be at least ${min}`;
  };

export const maxValue = (max: number, message?: string): ValidationRule =>
  (val: unknown) => {
    if (val === null || val === undefined || val === '') return true;
    return Number(val) <= max || message || `Must be at most ${max}`;
  };

export const pattern = (regex: RegExp, message: string): ValidationRule =>
  (val: unknown) => {
    if (!val || typeof val !== 'string') return true;
    return regex.test(val) || message;
  };

// Common patterns
export const usernamePattern = pattern(
  /^[a-zA-Z0-9_-]+$/,
  'Can only contain letters, numbers, underscores, and hyphens'
);

export const hasUppercase = pattern(
  /[A-Z]/,
  'Must contain at least one uppercase letter'
);

export const hasLowercase = pattern(
  /[a-z]/,
  'Must contain at least one lowercase letter'
);

export const hasNumber = pattern(
  /\d/,
  'Must contain at least one number'
);

// Email validator
export const email = (message = 'Please enter a valid email address'): ValidationRule =>
  (val: unknown) => {
    if (!val || typeof val !== 'string') return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || message;
  };

// URL validator
export const url = (message = 'Please enter a valid URL'): ValidationRule =>
  (val: unknown) => {
    if (!val || typeof val !== 'string') return true;
    try {
      new URL(val);
      return true;
    } catch {
      return message;
    }
  };

// IP Address validator
export const ipAddress = (message = 'Please enter a valid IP address'): ValidationRule =>
  (val: unknown) => {
    if (!val || typeof val !== 'string') return true;
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(val) || message;
  };

// Password match validator
export const matches = (targetValue: string, message = 'Values do not match'): ValidationRule =>
  (val: unknown) => val === targetValue || message;

// Number validators
export const isNumber = (message = 'Must be a number'): ValidationRule =>
  (val: unknown) => !val || !isNaN(Number(val)) || message;

export const isPositive = (message = 'Must be a positive number'): ValidationRule =>
  (val: unknown) => {
    if (val === null || val === undefined || val === '') return true;
    return Number(val) > 0 || message;
  };

export const isNonNegative = (message = 'Cannot be negative'): ValidationRule =>
  (val: unknown) => {
    if (val === null || val === undefined || val === '') return true;
    return Number(val) >= 0 || message;
  };

// Helper to combine multiple validators
export const combine = (...rules: ValidationRule[]): ValidationRule[] => rules;

// Commonly used combinations
export const passwordRules = (minLen = 6): ValidationRule[] => [
  required('Password is required'),
  minLength(minLen, `Password must be at least ${minLen} characters`),
  hasUppercase,
  hasLowercase,
  hasNumber,
];

export const simplePasswordRules = (minLen = 6): ValidationRule[] => [
  required('Password is required'),
  minLength(minLen, `Password must be at least ${minLen} characters`),
];

export const usernameRules = (): ValidationRule[] => [
  required('Username is required'),
  minLength(3, 'Username must be at least 3 characters'),
  maxLength(50, 'Username must be at most 50 characters'),
  usernamePattern,
];

export const confirmPasswordRules = (password: string): ValidationRule[] => [
  required('Please confirm your password'),
  matches(password, 'Passwords do not match'),
];