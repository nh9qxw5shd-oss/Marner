import type { PayConfig } from './tax/calc';

export interface Bill {
  id: string;
  description: string;
  amount: number;
  category: string;
  paid: boolean;
  position: number;
}

export type { PayConfig };
