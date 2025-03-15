import { COMPLEX_CONFIGS } from '../config/game-config';
import { ComplexConfig, ResourceCost } from '../types/complex';

/**
 * Получение конфигурации комплекса по типу
 */
export function getComplexConfig(complexType: string): ComplexConfig | undefined {
  return COMPLEX_CONFIGS[complexType as keyof typeof COMPLEX_CONFIGS];
}

/**
 * Расчет стоимости улучшения комплекса
 */
export function calculateUpgradeCost(complexType: string, currentLevel: number): ResourceCost {
  const config = getComplexConfig(complexType);
  if (!config) return {};
  
  const multiplier = Math.pow(config.costMultiplier, currentLevel - 1);
  const result: ResourceCost = {};
  
  // Применяем множитель ко всем ресурсам в базовой стоимости
  if (config.baseCost.energons) {
    result.energons = Math.floor(config.baseCost.energons * multiplier);
  }
  
  if (config.baseCost.neutrons) {
    result.neutrons = Math.floor(config.baseCost.neutrons * multiplier);
  }
  
  if (config.baseCost.particles) {
    result.particles = Math.floor(config.baseCost.particles * multiplier);
  }
  
  return result;
}

/**
 * Расчет производства комплекса для указанного уровня
 */
export function calculateProduction(complexType: string, level: number): number {
  const config = getComplexConfig(complexType);
  if (!config) return 0;
  
  return config.baseProduction * level;
}

/**
 * Проверка доступности комплекса
 */
export function isComplexAvailable(
  complexType: string,
  unlockedComplexes: Record<string, number>
): boolean {
  const config = getComplexConfig(complexType);
  if (!config) return false;
  
  // Если нет требований, значит комплекс доступен
  if (!config.requiredComplex || !config.requiredLevel) {
    return true;
  }
  
  // Проверяем, есть ли требуемый комплекс и его уровень
  const requiredComplexLevel = unlockedComplexes[config.requiredComplex];
  if (!requiredComplexLevel || requiredComplexLevel < config.requiredLevel) {
    return false;
  }
  
  return true;
}

/**
 * Проверка возможности улучшения комплекса (достаточно ли ресурсов)
 */
export function canUpgradeComplex(
  complexType: string,
  currentLevel: number,
  resources: ResourceCost
): boolean {
  const upgradeCost = calculateUpgradeCost(complexType, currentLevel);
  
  if (upgradeCost.energons && (!resources.energons || resources.energons < upgradeCost.energons)) {
    return false;
  }
  
  if (upgradeCost.neutrons && (!resources.neutrons || resources.neutrons < upgradeCost.neutrons)) {
    return false;
  }
  
  if (upgradeCost.particles && (!resources.particles || resources.particles < upgradeCost.particles)) {
    return false;
  }
  
  return true;
}

/**
 * Получить следующий доступный комплекс (для подсказок игроку)
 */
export function getNextAvailableComplex(
  unlockedComplexes: Record<string, number>
): string | null {
  // Преобразуем объект COMPLEX_CONFIGS в массив для удобства обработки
  const complexEntries = Object.entries(COMPLEX_CONFIGS);
  
  // Фильтруем комплексы, которые еще не разблокированы
  const notUnlockedComplexes = complexEntries.filter(
    ([complexType]) => !unlockedComplexes[complexType]
  );
  
  // Ищем первый комплекс, который можно разблокировать
  const nextAvailable = notUnlockedComplexes.find(([complexType]) => 
    isComplexAvailable(complexType, unlockedComplexes)
  );
  
  return nextAvailable ? nextAvailable[0] : null;
}

/**
 * Получить информацию о требованиях для разблокировки комплекса
 */
export function getUnlockRequirements(complexType: string): {
  requiredComplex: string;
  requiredLevel: number;
} | null {
  const config = getComplexConfig(complexType);
  
  if (!config || !config.requiredComplex || !config.requiredLevel) {
    return null;
  }
  
  return {
    requiredComplex: config.requiredComplex,
    requiredLevel: config.requiredLevel
  };
}