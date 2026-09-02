import { getSession } from 'next-auth/react';

export interface SubsidiaryBurnMetric {
  empresaId: number;
  nombreEmpresa: string;
  totalQuemado: string;
}

export interface SystemBurnMetric {
  totalSistema: string;
}

export const fetchHoldingBurnMetrics = async (): Promise<SubsidiaryBurnMetric[]> => {
  const session = await getSession();
  
  if (!session || !session.user?.email) {
    throw new Error('Autenticación requerida para acceder a las métricas.');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/metrics/holding-burn`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-user-email': session.user.email,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Fallo al obtener métricas del holding');
  }

  const json = await response.json();
  return json.data;
};

export const fetchSystemBurnMetrics = async (): Promise<SystemBurnMetric> => {
  const session = await getSession();
  
  if (!session || !session.user?.email) {
    throw new Error('Autenticación requerida.');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/metrics/system-burn`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-user-email': session.user.email,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Fallo al obtener métricas del sistema');
  }

  const json = await response.json();
  return json.data;
};