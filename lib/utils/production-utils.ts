import { COMPLEX_CONFIGS, BOOSTER_CONFIGS } from "../config/game-config";
import { ActiveBooster } from "../types/booster";

/**
 * Рассчитывает общее производство для пользователя на основе комплексов
 */
export function calculateTotalProduction(
  complexes: Array<{type: string; level: number}>,
  activeBoosters: ActiveBooster[] = []
): number {
  let totalProduction = 0;
  
  // Специальные множители для определенных комплексов (например, ZARYA-M)
  let kollektivMultiplier = 1.0;
  
  // Вычисляем множители от специальных комплексов
  complexes.forEach(complex => {
    const config = COMPLEX_CONFIGS[complex.type as keyof typeof COMPLEX_CONFIGS];
    if (!config) return;
    
    // ZARYA-M дает 5% бонуса за каждый уровень
    if (complex.type === "ZARYA-M") {
      kollektivMultiplier += 0.05 * complex.level;
    }
  });
  
  // Вычисляем базовое производство каждого комплекса
  complexes.forEach(complex => {
    const config = COMPLEX_CONFIGS[complex.type as keyof typeof COMPLEX_CONFIGS];
    if (!config) return;
    
    let production = config.baseProduction * complex.level;
    
    // Применяем специальные множители для определенных комплексов
    if (complex.type === "KOLLEKTIV-1") {
      production *= kollektivMultiplier;
    }
    
    totalProduction += production;
  });
  
  // Общий множитель от всех активных бустеров
  let boosterMultiplier = 1.0;
  
  // Учитываем бустеры
  const now = Date.now();
  activeBoosters.forEach(booster => {
    if (booster.endTime > now && booster.type === "PROTON-M87") {
      boosterMultiplier *= BOOSTER_CONFIGS[booster.type]?.multiplier || 1.0;
    }
  });
  
  return totalProduction * boosterMultiplier;
}

/**
 * Рассчитывает количество ресурсов, которые будут произведены за определенное время
 */
export function calculateResourcesProduced(
  productionRate: number,
  timeInSeconds: number
): number {
  return productionRate * timeInSeconds;
}

/**
 * Форматирует большие числа для отображения
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  } else if (Number.isInteger(num)) {
    return num.toString();
  } else {
    return num.toFixed(1);
  }
}