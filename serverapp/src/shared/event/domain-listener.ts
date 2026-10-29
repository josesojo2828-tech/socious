export class DomainEvent {
  entityName: string;
  action: string; // Ej: 'create', 'update', 'delete'
  payload: any; // Datos principales del evento
  metadata?: Record<string, any>; // Información extra opcional
  timestamp: Date;
  userId?: string;

  constructor(params: {
    entityName: string;
    action: string;
    payload: any;
    metadata?: Record<string, any>;
    userId?: string;
  }) {
    this.entityName = params.entityName;
    this.action = params.action;
    this.payload = params.payload;
    this.metadata = params.metadata;
    this.timestamp = new Date();
    this.userId = params.userId;
  }
}
