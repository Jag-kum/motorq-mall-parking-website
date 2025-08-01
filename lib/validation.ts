// Common validators used across API routes and client code

export const INDIAN_PLATE_REGEX = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;

export function isValidIndianPlate(plate: string): boolean {
  return INDIAN_PLATE_REGEX.test(plate.toUpperCase());
}
