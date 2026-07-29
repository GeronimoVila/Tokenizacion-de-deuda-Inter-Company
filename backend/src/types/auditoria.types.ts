// frontend/src/types/auditoria.types.ts

export interface FiltrosAuditoria {
  fechaInicio?: string;
  fechaFin?: string;
  contraparteId?: string; // <-- Agrega esta propiedad vital para el nuevo filtro
  montoMin?: string;
  montoMax?: string;
  estadoToken?: 'Activo' | 'Quemado' | '';
}