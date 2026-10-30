export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  return /^\d{10,12}$/.test(cleaned);
}

export function validateRequiredField(value: string): boolean {
  return value !== undefined && value !== null && value.trim().length > 0;
}
