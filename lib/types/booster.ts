import { ResourceCost } from './complex';

// Типы для бустеров
export interface BoosterConfig {
  name: string;
  description: string;
  duration: number; // в секундах
  multiplier: number;
  cost: ResourceCost;
  requiredComplex: string;
  requiredLevel: number;
  image: string;
}

export type BoosterConfigs = Record<string, BoosterConfig>;

export interface ActiveBooster {
  _id: string;
  userId: string;
  type: string;
  startTime: number;
  endTime: number;
}