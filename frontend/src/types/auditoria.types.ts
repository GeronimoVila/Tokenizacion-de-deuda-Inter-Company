import { ReactNode } from "react";

export interface FiltrosAuditoria {
  fechaInicio?: string;
  fechaFin?: string;
  contraparteId?: string;
  montoMin?: string;
  montoMax?: string;
  estadoToken?: 'Emitida' | 'Liquidada' | 'Pendiente de Validación' | 'RECHAZADA' | '';
}

export interface EmpresaBasica {
  id: number;
  nombre: string;
  cuit: string;
}

export interface TransaccionUnificada {
  id: number;
  monto: string;
  detalle: string;
  url_documento_respaldo: string;
  estado_validacion: 'Emitida' | 'Liquidada' | 'Pendiente de Validación' | 'RECHAZADA';
  fecha_creacion: string;
  fecha_validacion?: string;
  empresa_emisora: { nombre: string; cuit: string };
  empresa_receptora: { nombre: string; cuit: string };
  
  tokens_deuda?: { 
    token_id_blockchain: string;
    estado_token: 'Activo' | 'Quemado';
    txhash_mint: string;
    txhash_burn?: string | null;
    block_number: number;
  }[];
}

export interface CompensacionDetalleHistorial {
  id: number;
  monto_compensado: string;
  token: { 
    token_id_blockchain: string;
    txhash_burn: string;
    transaccion: {
      empresa_emisora: { nombre: string; cuit: string };
      empresa_receptora: { nombre: string; cuit: string };
    }
  }
}

export interface CompensacionHistorial {
  id: number;
  fecha: string;
  descripcion: string;
  usuario_ejecutor: {
      nombre: ReactNode; name: string; email: string 
};
  detalles: CompensacionDetalleHistorial[];
}

export interface CierrePasivoHistorial {
  id: string;
  tipo: 'Netting Algorítmico' | 'Liquidación Bancaria (Manual)';
  fecha: string;
  descripcion: string;
  operador: string;
  tokens_quemados: {
    id_token: string;
    txhash_burn: string;
    monto_saldado: string;
    acreedor: string;
    deudor: string;
  }[];
}