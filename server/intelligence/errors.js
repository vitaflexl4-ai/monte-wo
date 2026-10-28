// Intelligence API errors: fail closed with explicit machine-readable codes.
export class IntelError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export function requireThat(condition, code, status = 400) {
  if (!condition) throw new IntelError(code, status);
}
