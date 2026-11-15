export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) && email.length <= 190;
}
export function validatePassword(pw: string): string | null {
  if (pw.length < 10) return 'Password must be at least 10 characters.';
  if (pw.length > 200) return 'Password is too long.';
  if (/^(?:password|12345678|qwerty)/i.test(pw)) return 'Pick a less obvious password.';
  return null;
}
