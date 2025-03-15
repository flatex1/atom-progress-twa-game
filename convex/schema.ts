import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Пользователи
  users: defineTable({
    telegramId: v.number(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),

    // Ресурсы
    energons: v.number(),
    neutrons: v.number(),
    particles: v.number(),

    // Метрики
    totalProduction: v.number(),
    totalNeutronProduction: v.optional(v.number()),
    totalParticleProduction: v.optional(v.number()),
    totalClicks: v.number(),
    manualClicks: v.number(),

    // Множители
    productionMultiplier: v.optional(v.number()),
    neutronMultiplier: v.optional(v.number()),
    particleMultiplier: v.optional(v.number()),
    clickMultiplier: v.optional(v.number()),

    // Временные метки
    lastActivity: v.number(),
    createdAt: v.number(),
    lastSyncTime: v.optional(v.number()),

    // Бонусы
    dailyBonusClaimed: v.boolean(),
    bonusStreak: v.optional(v.number()),
    lastDailyBonusDate: v.optional(v.number()),
  }).index("by_telegramId", ["telegramId"]),

  // Научные комплексы
  complexes: defineTable({
    userId: v.id("users"),
    type: v.string(), // Идентификатор из COMPLEX_CONFIGS
    level: v.number(),
    production: v.number(),
    lastUpgraded: v.number(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userAndType", ["userId", "type"]),

  // Активные бустеры
  boosters: defineTable({
    userId: v.id("users"),
    type: v.string(), // Идентификатор из BOOSTER_CONFIGS
    startTime: v.number(),
    endTime: v.number(),
    multiplier: v.number(),
    affectsResource: v.string(), // "energons", "neutrons", "particles", "all"
  })
    .index("by_userId", ["userId"])
    .index("by_userAndActive", ["userId", "endTime"]),

  // Статистика действий
  statistics: defineTable({
    userId: v.id("users"),
    event: v.string(), // 'click', 'upgrade', 'booster_activation', etc.
    value: v.number(),
    timestamp: v.number(),
    metadata: v.optional(v.string()), // JSON с дополнительными данными
  })
    .index("by_userId", ["userId"])
    .index("by_userAndEvent", ["userId", "event"]),

  // Таблица рейтинга
  leaderboard: defineTable({
    userId: v.id("users"),
    telegramId: v.number(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    energons: v.number(),
    totalLevel: v.number(), // Сумма уровней всех комплексов
    totalProduction: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_energons", ["energons"])
    .index("by_production", ["totalProduction"]),

  // Добавляем таблицу для истории изменений ресурсов
  resourceHistory: defineTable({
    userId: v.id("users"),
    timestamp: v.number(),
    energonsAdded: v.number(),
    neutronsAdded: v.number(),
    particlesAdded: v.number(),
    timeElapsed: v.optional(v.number()),
    source: v.string(), // lazy_evaluation, manual_click, complex_production, booster, app_closing_sync, ...
    energonProduction: v.optional(v.number()),
    neutronProduction: v.optional(v.number()),
    particleProduction: v.optional(v.number()),
    metadata: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_timestamp", ["timestamp"]),
});
