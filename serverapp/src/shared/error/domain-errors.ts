// src/core/errors/app.exception.ts
import { HttpException, HttpStatus } from "@nestjs/common";

export class BaseAppException extends HttpException {
  constructor(message: string, status: HttpStatus) {
    super(message, status);
  }
}

// src/core/errors/domain-errors.ts
export class EntityNotFoundException extends BaseAppException {
  constructor(entity: string) {
    const isFeminine = /lista|dirección|suscripción|meta|dieta|medición/i.test(entity);
    super(`${entity} no ${isFeminine ? "encontrada" : "encontrado"}`, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateEntryException extends BaseAppException {
  constructor(message = "El registro ya existe") {
    super(message, HttpStatus.CONFLICT);
  }
}

export class BusinessLogicException extends BaseAppException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}
