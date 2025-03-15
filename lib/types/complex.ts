// Типы для комплексов
export interface ResourceCost {
    energons?: number;
    neutrons?: number;
    particles?: number;
  }
  
  export interface ComplexConfig {
    name: string;
    description: string;
    baseProduction: number;
    baseCost: ResourceCost;
    costMultiplier: number;
    requiredComplex?: string;
    requiredLevel?: number;
    image: string;
  }
  
  export type ComplexConfigs = Record<string, ComplexConfig>;
  
  export interface Complex {
    _id: string;
    type: string;
    level: number;
    production: number;
    lastUpgraded: number;
    userId: string;
  }