import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Получение пользователя по telegramId
export const getUserByTelegramId = query({
  args: { telegramId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", args.telegramId))
      .first();
  },
});

// Создание нового пользователя
export const createUser = mutation({
  args: {
    telegramId: v.number(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Проверяем, существует ли пользователь
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", args.telegramId))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    // Создаем нового пользователя с начальными значениями
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      telegramId: args.telegramId,
      username: args.username,
      firstName: args.firstName,
      lastName: args.lastName,
      energons: 0,
      neutrons: 0,
      particles: 0,
      totalProduction: 0,
      totalClicks: 0,
      manualClicks: 0,
      lastActivity: now,
      createdAt: now,
      dailyBonusClaimed: false,
      bonusStreak: 0,
    });
    
    // Создаем начальный комплекс для нового пользователя
    await ctx.db.insert("complexes", {
      userId,
      type: "KOLLEKTIV-1",
      level: 1,
      production: 1,
      lastUpgraded: now,
      createdAt: now,
    });
    
    // Обновляем общее производство
    await ctx.db.patch(userId, {
      totalProduction: 1
    });
    
    // Обновляем рейтинг
    await ctx.db.insert("leaderboard", {
      userId,
      telegramId: args.telegramId,
      username: args.username,
      firstName: args.firstName,
      energons: 0,
      totalLevel: 1,
      totalProduction: 1,
      createdAt: now,
      updatedAt: now,
    });
    
    return userId;
  },
});

// Получение данных пользователя с комплексами
export const getUserWithComplexes = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    
    const complexes = await ctx.db
      .query("complexes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    
    return { user, complexes };
  },
});

// Получение текущих ресурсов пользователя с учетом накопленных ресурсов
export const getUserResourcesWithAccrual = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }
    
    const now = Date.now();
    const timeElapsed = (now - user.lastActivity) / 1000; // в секундах
    
    // Получаем активные бустеры
    const boosters = await ctx.db
      .query("boosters")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gt(q.field("endTime"), now))
      .collect();
    
    // Рассчитываем множители для всех ресурсов
    const energonMultiplier = boosters.reduce((multiplier, booster) => {
      if (booster.affectsResource === "energons" || booster.affectsResource === "all") {
        return multiplier * booster.multiplier;
      }
      return multiplier;
    }, user.productionMultiplier || 1);
    
    const neutronMultiplier = boosters.reduce((multiplier, booster) => {
      if (booster.affectsResource === "neutrons" || booster.affectsResource === "all") {
        return multiplier * booster.multiplier;
      }
      return multiplier;
    }, user.neutronMultiplier || 1);
    
    const particleMultiplier = boosters.reduce((multiplier, booster) => {
      if (booster.affectsResource === "particles" || booster.affectsResource === "all") {
        return multiplier * booster.multiplier;
      }
      return multiplier;
    }, user.particleMultiplier || 1);
    
    // Рассчитываем накопленные ресурсы
    const baseEnergonProduction = user.totalProduction || 0;
    const baseNeutronProduction = user.totalNeutronProduction || 0;
    const baseParticleProduction = user.totalParticleProduction || 0;
    
    const totalEnergonProduction = baseEnergonProduction * energonMultiplier;
    const totalNeutronProduction = baseNeutronProduction * neutronMultiplier;
    const totalParticleProduction = baseParticleProduction * particleMultiplier;
    
    const accruedEnergons = Math.floor(totalEnergonProduction * timeElapsed);
    const accruedNeutrons = Math.floor(totalNeutronProduction * timeElapsed);
    const accruedParticles = Math.floor(totalParticleProduction * timeElapsed);
    
    // Возвращаем общую информацию о ресурсах
    return {
      energons: user.energons + accruedEnergons,
      neutrons: user.neutrons + accruedNeutrons,
      particles: user.particles + accruedParticles,
      totalProduction: baseEnergonProduction,
      totalNeutronProduction: baseNeutronProduction,
      totalParticleProduction: baseParticleProduction,
      productionMultiplier: energonMultiplier,
      neutronMultiplier,
      particleMultiplier,
      activeBoostersCount: boosters.length,
      lastActivity: user.lastActivity,
      secondsSinceLastActivity: timeElapsed
    };
  },
});

// Получение статистики пользователя
export const getUserStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }
    
    return {
      totalClicks: user.totalClicks || 0,
      manualClicks: user.manualClicks || 0,
      lastActivity: user.lastActivity,
      createdAt: user.createdAt,
      bonusStreak: user.bonusStreak || 0,
      dailyBonusClaimed: user.dailyBonusClaimed || false
    };
  },
});