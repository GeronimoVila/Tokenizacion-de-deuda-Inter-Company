export interface FiltrosAuditoria {
  fechaInicio?: string;
  fechaFin?: string;
  contraparteId?: string;
  empresaEmisoraId?: string;
  empresaReceptoraId?: string;
  montoMin?: string;
  montoMax?: string;
  estadoToken?: 'Activo' | 'Quemado' | '';
}

export interface TransaccionOrigen {
  detalle: string;
  url_documento_respaldo: string;
  fecha_validacion: string;
  empresa_emisora: { nombre: string; cuit: string };
  empresa_receptora: { nombre: string; cuit: string };
}

export interface TokenDeudaHistorial {
  id: number;
  transaccion_id: number;
  token_id_blockchain: string;
  monto_actual: string;
  estado_token: 'Activo' | 'Quemado';
  txhash_mint: string;
  txhash_burn?: string;
  block_number: number;
  transaccion: TransaccionOrigen;
}