export class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 'NOT_FOUND');
  }
}
export class ConflictError extends DomainError {
  constructor(message: string, public readonly fieldErrors?: Record<string, string>) {
    super(message, 'CONFLICT');
  }
}
export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION');
  }
}
