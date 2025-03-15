import { COMPLEX_CONFIGS } from "../config/game-config";
import { calculateTotalProduction } from "./production-utils";

/**
 * Расчет силы клика на основе производства и уровней комплексов
 */
export function calculateClickPower(
  complexes: Array<{type: string; level: number}>,
  userMultiplier: number = 1.0
): number {
  let basePower = 10; // Базовая сила клика
  const totalProduction = calculateTotalProduction(complexes);
  
  // Вклад от общего производства
  basePower += totalProduction * 0.1;
  
  // Дополнительные бонусы от KRASNIY-CIKLOTRON (10% за уровень)
  const ciklotron = complexes.find(c => c.type === "KRASNIY-CIKLOTRON");
  if (ciklotron) {
    basePower *= (1 + 0.1 * ciklotron.level);
  }
  
  // Применяем общий множитель пользователя
  return basePower * userMultiplier;
}

/**
 * Расчет производства нейтронов
 */
export function calculateNeutronProduction(
  complexes: Array<{type: string; level: number}>
): number {
  let neutronProduction = 0;
  
  complexes.forEach(complex => {
    if (complex.type === "SOYUZ-ATOM") {
      const config = COMPLEX_CONFIGS[complex.type];
      if (config) {
        neutronProduction += config.baseProduction * complex.level;
      }
    }
  });
  
  return neutronProduction;
}

/**
 * Расчет производства частиц
 */
export function calculateParticleProduction(
  complexes: Array<{type: string; level: number}>
): number {
  let particleProduction = 0;
  
  complexes.forEach(complex => {
    if (complex.type === "KVANT-SIBIR") {
      const config = COMPLEX_CONFIGS[complex.type];
      if (config) {
        particleProduction += config.baseProduction * complex.level;
      }
    }
  });
  
  return particleProduction;
}

/**
 * Расчет ресурсов, накопленных в автономном режиме (оффлайн)
 */
export function calculateOfflineProduction(
  totalProduction: number,
  neutronProduction: number,
  particleProduction: number,
  lastActivity: number,
  maxOfflineTime: number = 24 * 60 * 60 * 1000 // 24 часа в мс по умолчанию
): { energons: number; neutrons: number; particles: number; offlineTime: number } {
  const now = Date.now();
  const offlineTime = Math.min(now - lastActivity, maxOfflineTime);
  const offlineSeconds = offlineTime / 1000;
  
  return {
    energons: totalProduction * offlineSeconds,
    neutrons: neutronProduction * offlineSeconds,
    particles: particleProduction * offlineSeconds,
    offlineTime
  };
}

/**
 * Форматирование времени в человекочитаемый формат
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.ceil(seconds)} сек`;
  } else if (seconds < 3600) {
    return `${Math.ceil(seconds / 60)} мин`;
  } else if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)} ч ${Math.floor((seconds % 3600) / 60)} мин`;
  } else {
    return `${Math.floor(seconds / 86400)} д ${Math.floor((seconds % 86400) / 3600)} ч`;
  }
}