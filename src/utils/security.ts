export function validatePasswordStrength(password: string): boolean {
  const hasMinLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  return hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
}

export function maskAccountNumber(accountNumber: string): string {
  const visible = accountNumber.slice(-4);
  return `****-****-${visible}`;
}
