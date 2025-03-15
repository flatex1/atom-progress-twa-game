/**
 * Конфигурация игры "Атомный Прогресс"
 * Содержит настройки научных комплексов и бустеров
 */

// Конфигурация научных комплексов
export const COMPLEX_CONFIGS = {
  "KOLLEKTIV-1": {
    name: "КОЛЛЕКТИВ-1",
    description: "Базовый генератор энергии. Производит 1 Энергон в секунду.",
    baseProduction: 1,
    baseCost: {
      energons: 100,
      neutrons: 0,
      particles: 0,
    },
    costMultiplier: 1.5,
    image: "./public/assets/complex_kollektiv.png",
    producesResource: "energons",
  },
  "ZARYA-M": {
    name: "ЗАРЯ-М",
    description: "Увеличивает производство Энергонов на 5% за уровень.",
    baseProduction: 0,
    baseCost: {
      energons: 500,
      neutrons: 0,
      particles: 0,
    },
    costMultiplier: 1.6,
    requiredComplex: "KOLLEKTIV-1",
    requiredLevel: 3,
    image: "./public/assets/complex_zarya.png",
    producesResource: "energons",
    productionType: "multiplier",
    multiplierPerLevel: 0.05,
  },
  "SOYUZ-ATOM": {
    name: "СОЮЗ-АТОМ",
    description:
      "Производит Нейтроны - вторичную валюту для продвинутых разработок.",
    baseProduction: 0.2,
    baseCost: {
      energons: 2000,
      neutrons: 0,
      particles: 0,
    },
    costMultiplier: 1.7,
    requiredComplex: "KOLLEKTIV-1",
    requiredLevel: 5,
    image: "./public/assets/complex_soyuz.png",
    producesResource: "neutrons",
  },
  "KRASNIY-CIKLOTRON": {
    name: "КРАСНЫЙ ЦИКЛОТРОН",
    description: "Увеличивает мощность клика на 10% за уровень.",
    baseProduction: 0,
    baseCost: {
      energons: 1500,
      neutrons: 0,
      particles: 0,
    },
    costMultiplier: 1.7,
    requiredComplex: "KOLLEKTIV-1",
    requiredLevel: 5,
    image: "./public/assets/complex_krasniy.png",
    producesResource: "energons",
    productionType: "click",
    multiplierPerLevel: 0.1,
  },
  "AKADEMGOROD-17": {
    name: "АКАДЕМГОРОД-17",
    description:
      "Обучает научных сотрудников, дающих пассивные бонусы ко всему производству.",
    baseProduction: 0,
    baseCost: {
      energons: 5000,
      neutrons: 100,
      particles: 0,
    },
    costMultiplier: 1.8,
    requiredComplex: "SOYUZ-ATOM",
    requiredLevel: 3,
    image: "./public/assets/complex_akadem.png",
    producesResource: "all",
    productionType: "multiplier",
    multiplierPerLevel: 0.02,
  },
  "SPUTNIK-GAMMA": {
    name: "СПУТНИК-ГАММА",
    description: "Даёт бонусы ко всем ресурсам каждые 30 минут.",
    baseProduction: 0,
    baseCost: {
      energons: 10000,
      neutrons: 500,
      particles: 0,
    },
    costMultiplier: 2.0,
    requiredComplex: "AKADEMGOROD-17",
    requiredLevel: 2,
    image: "./public/assets/complex_sputnik.png",
    producesResource: "all",
    productionType: "periodic",
    periodMinutes: 30,
  },
  "KVANT-SIBIR": {
    name: "КВАНТ-СИБИРЬ",
    description: "Генерирует Квантовые Частицы для престижных улучшений.",
    baseProduction: 0.05,
    baseCost: {
      energons: 25000,
      neutrons: 1000,
      particles: 0,
    },
    costMultiplier: 2.2,
    requiredComplex: "SPUTNIK-GAMMA",
    requiredLevel: 2,
    image: "./public/assets/complex_kvant.png",
    producesResource: "particles",
  },
  "MATERIYA-3": {
    name: "МАТЕРИЯ-3",
    description: "Создаёт редкие материалы для особых улучшений.",
    baseProduction: 0,
    baseCost: {
      energons: 50000,
      neutrons: 2500,
      particles: 0,
    },
    costMultiplier: 2.5,
    requiredComplex: "KVANT-SIBIR",
    requiredLevel: 3,
    image: "./public/assets/complex_materiya.png",
    producesResource: "particles",
    productionType: "special",
  },
  "MOZG-MACHINA": {
    name: "МОЗГ-МАШИНА",
    description: "Автоматизирует часть кликов (автокликер внутри игры).",
    baseProduction: 0,
    baseCost: {
      energons: 75000,
      neutrons: 5000,
      particles: 100,
    },
    costMultiplier: 3.0,
    requiredComplex: "MATERIYA-3",
    requiredLevel: 2,
    image: "./public/assets/complex_mozg.png",
    producesResource: "energons",
    productionType: "autoclicker",
    clicksPerSecond: 1,
  },
  "POLYUS-K88": {
    name: "ПОЛЮС-К88",
    description: "Открывает сезонные события с уникальными наградами.",
    baseProduction: 0,
    baseCost: {
      energons: 100000,
      neutrons: 10000,
      particles: 250,
    },
    costMultiplier: 3.5,
    requiredComplex: "MOZG-MACHINA",
    requiredLevel: 2,
    image: "./public/assets/complex_polyus.png",
    producesResource: "all",
    productionType: "events",
  },
};

// Конфигурация временных бустеров
export const BOOSTER_CONFIGS = {
  "PROTON-M87": {
    name: "Протон-М87",
    description: "+200% к производству на 4 часа",
    duration: 4 * 60 * 60, // 4 часа в секундах
    multiplier: 3.0, // +200%
    cost: {
      energons: 5000,
      neutrons: 0,
      particles: 0,
    },
    requiredComplex: "ZARYA-M",
    requiredLevel: 2,
    image: "./public/assets/booster_proton.png",
    affectsResource: "energons", // Влияет только на энергоны
    isInstantBooster: false,
    specialEffect: undefined,
  },
  "RED-STAR": {
    name: "Красная Звезда",
    description: "Мгновенно добавляет 24 часа производства",
    duration: 1, // Мгновенный эффект
    multiplier: 1.0,
    cost: {
      energons: 10000,
      neutrons: 500,
      particles: 0,
    },
    requiredComplex: "SOYUZ-ATOM",
    requiredLevel: 5,
    image: "./public/assets/booster_red_star.png",
    affectsResource: "all", // Влияет на все ресурсы
    isInstantBooster: true, // Мгновенный эффект
    specialEffect: undefined,
  },
  "ATOMIC-HEART-42": {
    name: "Атомное Сердце-42",
    description: "Удваивает скорость всех исследований на 12 часов",
    duration: 12 * 60 * 60, // 12 часов в секундах
    multiplier: 2.0,
    cost: {
      energons: 15000,
      neutrons: 1000,
      particles: 0,
    },
    requiredComplex: "AKADEMGOROD-17",
    requiredLevel: 3,
    image: "./public/assets/booster_atomic_heart.png",
    affectsResource: "all", // Влияет на все ресурсы
    isInstantBooster: false,
    specialEffect: undefined,
  },
  "IRON-COMRADE": {
    name: "Железный Товарищ",
    description: "Автоматически собирает бонусы на 8 часов",
    duration: 8 * 60 * 60, // 8 часов в секундах
    multiplier: 1.0,
    cost: {
      energons: 20000,
      neutrons: 2000,
      particles: 0,
    },
    requiredComplex: "SPUTNIK-GAMMA",
    requiredLevel: 3,
    image: "./public/assets/booster_iron_commrade.png",
    affectsResource: "all", // Влияет на все ресурсы
    specialEffect: "auto_collect", // Специальный эффект
    isInstantBooster: false,
  },
  "T-POLYMER": {
    name: "Т-Полимер",
    description: "Увеличивает стоимость всех ресурсов на 150% на 6 часов",
    duration: 6 * 60 * 60, // 6 часов в секундах
    multiplier: 2.5, // +150%
    cost: {
      energons: 25000,
      neutrons: 3000,
      particles: 50,
    },
    requiredComplex: "KVANT-SIBIR",
    requiredLevel: 2,
    image: "./public/assets/booster_t_polymer.png",
    affectsResource: "all", // Влияет на все ресурсы
    isInstantBooster: false,
    specialEffect: undefined,
  },
};

// Константы игровой механики
export const GAME_CONSTANTS = {
  // Базовые значения производства
  BASE_CLICK_ENERGY: 10, // Энергия от одного клика
  BASE_INTERVAL_TICKS: 1000, // Интервал обновления в мс
  
  // Множители для вычисления бонусов
  CLICK_POWER_MULTIPLIER_PER_PRODUCTION: 0.1, // 10% от производства идет в мощность клика
  NEUTRON_RARITY_FACTOR: 10, // Нейтроны в 10 раз реже энергонов
  PARTICLE_RARITY_FACTOR: 100, // Частицы в 100 раз реже нейтронов
  
  // Временные ограничения
  OFFLINE_PRODUCTION_MAX_TIME: 24 * 60 * 60, // Максимальное время офлайн производства (24 часа)
  AUTO_SAVE_INTERVAL: 60 * 1000, // Автосохранение каждую минуту
  SYNC_INTERVAL: 30 * 1000, // Интервал синхронизации с сервером (30 секунд)
  
  // Константы для расчетов
  MAX_BOOST_MULTIPLIER: 10, // Максимальный множитель от всех источников
  PRESTIGE_POINT_FACTOR: 1e6, // Фактор для расчета очков престижа
  
  // Игровые лимиты
  MAX_ACTIVE_BOOSTERS: 5, // Максимум активных бустеров одновременно
  MAX_COMPLEX_LEVEL: 1000, // Максимальный уровень комплекса
  
  // Константы интерфейса
  RESOURCES_UPDATE_INTERVAL: 100, // Частота обновления отображения ресурсов (мс)
};

// Достижения
export const ACHIEVEMENTS = [
  {
    id: "first_steps",
    name: "Первые шаги",
    description: "Построить первый комплекс",
    icon: "🏭",
    condition: {
      type: "complex_count",
      target: 1
    },
    reward: {
      type: "resource",
      resourceType: "energons",
      amount: 200
    }
  },
  {
    id: "energy_tycoon",
    name: "Энергетический магнат",
    description: "Накопите 10,000 энергонов",
    icon: "💰",
    condition: {
      type: "resource_amount",
      resourceType: "energons",
      target: 10000
    },
    reward: {
      type: "resource",
      resourceType: "neutrons",
      amount: 50
    }
  },
  {
    id: "click_maniac",
    name: "Кликомания",
    description: "Кликните 1,000 раз",
    icon: "👆",
    condition: {
      type: "clicks",
      target: 1000
    },
    reward: {
      type: "resource",
      resourceType: "energons",
      amount: 1000
    }
  },
  {
    id: "science_empire",
    name: "Научная империя",
    description: "Постройте 5 разных типов комплексов",
    icon: "🔬",
    condition: {
      type: "complex_types",
      target: 5
    },
    reward: {
      type: "resource",
      resourceType: "neutrons",
      amount: 100
    }
  },
  {
    id: "boost_master",
    name: "Мастер ускорения",
    description: "Активируйте каждый тип бустера хотя бы раз",
    icon: "🚀",
    condition: {
      type: "booster_types",
      target: 3
    },
    reward: {
      type: "resource",
      resourceType: "particles",
      amount: 10
    }
  }
];

// Типы ресурсов
export const RESOURCE_TYPES = {
  ENERGONS: "energons",
  NEUTRONS: "neutrons",
  PARTICLES: "particles",
};

// Типы источников ресурсов для истории
export const RESOURCE_SOURCES = {
  MANUAL_CLICK: "manual_click",
  COMPLEX_PRODUCTION: "complex_production",
  OFFLINE_PRODUCTION: "offline_production",
  BOOSTER: "booster",
  DAILY_BONUS: "daily_bonus",
  ACHIEVEMENT: "achievement",
  LAZY_EVALUATION: "lazy_evaluation",
  APP_CLOSING_SYNC: "app_closing_sync",
};