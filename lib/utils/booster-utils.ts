import { BOOSTER_CONFIGS } from '../config/game-config';
import { BoosterConfig, ActiveBooster } from '../types/booster';
import { ResourceCost } from '../types/complex';

/**
 * Получение конфигурации бустера по типу
 */
export function getBoosterConfig(boosterType: string): BoosterConfig | undefined {
  return BOOSTER_CONFIGS[boosterType as keyof typeof BOOSTER_CONFIGS];
}

/**
 * Проверка доступности бустера
 */
export function isBoosterAvailable(
  boosterType: string,
  unlockedComplexes: Record<string, number>
): boolean {
  const config = getBoosterConfig(boosterType);
  if (!config) return false;
  
  const requiredComplexLevel = unlockedComplexes[config.requiredComplex];
  if (!requiredComplexLevel || requiredComplexLevel < config.requiredLevel) {
    return false;
  }
  
  return true;
}

/**
 * Проверка достаточности ресурсов для активации бустера
 */
export function canActivateBooster(
  boosterType: string,
  resources: ResourceCost
): boolean {
  const config = getBoosterConfig(boosterType);
  if (!config) return false;
  
  if (config.cost.energons && (!resources.energons || resources.energons < config.cost.energons)) {
    return false;
  }
  
  if (config.cost.neutrons && (!resources.neutrons || resources.neutrons < config.cost.neutrons)) {
    return false;
  }
  
  if (config.cost.particles && (!resources.particles || resources.particles < config.cost.particles)) {
    return false;
  }
  
  return true;
}

/**
 * Расчет множителя для активных бустеров
 * @param activeBoosters Список активных бустеров
 * @param type Тип множителя ('production', 'click', 'research', 'resource_value')
 */
export function calculateBoosterMultiplier(
  activeBoosters: ActiveBooster[],
  type: 'production' | 'click' | 'research' | 'resource_value'
): number {
  // Базовый множитель без бустеров
  let multiplier = 1.0;
  const now = Date.now();
  
  // Фильтруем только активные бустеры (время еще не истекло)
  const currentActiveBoosters = activeBoosters.filter(booster => booster.endTime > now);
  
  // Применяем множители от каждого активного бустера
  currentActiveBoosters.forEach(booster => {
    const config = getBoosterConfig(booster.type);
    if (!config) return;
    
    // В зависимости от типа бустера применяем соответствующий множитель
    switch (booster.type) {
      case 'PROTON-M87':
        if (type === 'production') {
          multiplier *= config.multiplier;
        }
        break;
      case 'ATOMIC-HEART-42':
        if (type === 'research') {
          multiplier *= config.multiplier;
        }
        break;
      case 'T-POLYMER':
        if (type === 'resource_value') {
          multiplier *= config.multiplier;
        }
        break;
      // Добавим другие типы бустеров по мере необходимости
    }
  });
  
  return multiplier;
}

/**
 * Функция для вычисления времени до окончания действия бустера
 */
export function getBoosterRemainingTime(booster: ActiveBooster): number {
  const now = Date.now();
  return Math.max(0, booster.endTime - now);
}

/**
 * Форматирование оставшегося времени бустера
 */
export function formatBoosterTime(remainingMs: number): string {
  if (remainingMs <= 0) return "Окончен";
  
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours} ч ${minutes} мин`;
  } else if (minutes > 0) {
    return `${minutes} мин ${seconds} сек`;
  } else {
    return `${seconds} сек`;
  }
}