export function maskPassport(value: string): string {
  if (value.length <= 3) return '***';
  return `${value.slice(0, 1)}${'*'.repeat(Math.max(3, value.length - 3))}${value.slice(-2)}`;
}

export const logger = {
  info(message: string): void {
    console.log(message);
  },
  warn(message: string): void {
    console.warn(message);
  },
  error(message: string): void {
    console.error(message);
  },
};
