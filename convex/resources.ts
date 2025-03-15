import { api } from "./_generated/api";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Начисление ресурсов за период отсутствия
export const collectOfflineProduction = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }
    
    const now = Date.now();
    const timeOffline = now - user.lastActivity;
    
    // Ограничиваем максимальное время оффлайн (например, 24 часа)
    const maxOfflineTime = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах
    const effectiveOfflineTime = Math.min(timeOffline, maxOfflineTime);
    
    // Если прошло слишком мало времени, не начисляем ресурсы
    if (effectiveOfflineTime < 10000) { // меньше 10 секунд
      return { earnedEnergons: 0, timeOffline: 0 };
    }
    
    // Расчет производства в секунду
    const secondsOffline = Math.floor(effectiveOfflineTime / 1000);
    const productionMultiplier = user.productionMultiplier || 1;
    const totalProduction = user.totalProduction * productionMultiplier;
    
    // Начисление энергонов за время отсутствия
    const earnedEnergons = Math.floor(totalProduction * secondsOffline);
    
    // Обновляем ресурсы пользователя
    await ctx.db.patch(args.userId, {
      energons: user.energons + earnedEnergons,
      lastActivity: now,
    });
    
    // Записываем статистику
    await ctx.db.insert("statistics", {
      userId: args.userId,
      event: "offline_production",
      value: earnedEnergons,
      timestamp: now,
      metadata: JSON.stringify({
        secondsOffline,
        productionRate: totalProduction
      }),
    });
    
    // Обновляем рейтинг
    const leaderboardEntry = await ctx.db
      .query("leaderboard")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    if (leaderboardEntry) {
      await ctx.db.patch(leaderboardEntry._id, {
        energons: user.energons + earnedEnergons,
        updatedAt: now,
      });
    }
    
    return {
      earnedEnergons,
      secondsOffline,
      totalEnergons: user.energons + earnedEnergons,
      productionRate: totalProduction
    };
  }
});

// Активация временного бустера
export const activateBooster = mutation({
  args: {
    userId: v.id("users"),
    boosterType: v.string(),
    boosterName: v.string(),
    duration: v.number(), // длительность в минутах
    cost: v.optional(v.number()), // стоимость активации
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }
    
    // Если указана стоимость, проверяем наличие ресурсов
    if (args.cost && user.energons < args.cost) {
      throw new Error("Недостаточно энергонов для активации бустера");
    }
    
    const now = Date.now();
    const endTime = now + args.duration * 60 * 1000;
    
    // Списываем ресурсы, если есть стоимость
    const updates: Record<string, unknown> = {
      activeBoosterType: args.boosterType,
      activeBoosterName: args.boosterName,
      boosterEndTime: endTime,
    };
    
    if (args.cost) {
      updates.energons = user.energons - args.cost;
    }
    
    // Активируем бустер
    await ctx.db.patch(args.userId, updates);
    
    // Записываем статистику
    await ctx.db.insert("statistics", {
      userId: args.userId,
      event: "booster_activated",
      value: args.duration,
      timestamp: now,
      metadata: JSON.stringify({
        type: args.boosterType,
        name: args.boosterName,
        cost: args.cost,
        endTime
      }),
    });
    
    return {
      boosterType: args.boosterType,
      boosterName: args.boosterName,
      endTime,
    };
  }
});

// Получение ежедневного бонуса
export const claimDailyBonus = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }
    
    // Проверяем, получал ли пользователь сегодня бонус
    if (user.dailyBonusClaimed) {
      const now = new Date();
      const lastBonusDate = new Date(user.lastActivity);
      
      // Если сегодня уже получал бонус, нельзя получить снова
      if (
        now.getUTCFullYear() === lastBonusDate.getUTCFullYear() && 
        now.getUTCMonth() === lastBonusDate.getUTCMonth() && 
        now.getUTCDate() === lastBonusDate.getUTCDate()
      ) {
        throw new Error("Вы уже получили ежедневный бонус сегодня");
      }
    }
    
    // Рассчитываем бонус в зависимости от серии дней
    const streak = user.bonusStreak || 0;
    const newStreak = streak + 1;
    
    // Базовый бонус увеличивается с каждым днем, но не более 7 дней подряд
    const baseBonus = 100;
    const streakMultiplier = Math.min(newStreak, 7);
    const bonusAmount = baseBonus * streakMultiplier;
    
    // Обновляем пользователя
    await ctx.db.patch(args.userId, {
      energons: user.energons + bonusAmount,
      dailyBonusClaimed: true,
      bonusStreak: newStreak,
      lastActivity: Date.now(),
    });
    
    // Записываем статистику
    await ctx.db.insert("statistics", {
      userId: args.userId,
      event: "daily_bonus",
      value: bonusAmount,
      timestamp: Date.now(),
      metadata: JSON.stringify({
        streak: newStreak,
      }),
    });
    
    return {
      bonusAmount,
      streak: newStreak,
      totalEnergons: user.energons + bonusAmount
    };
  }
});

// Обработка ручного клика для получения ресурсов
export const manualClick = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }
    
    // Расчет базового дохода от клика
    const baseClickValue = 1;
    const multiplier = user.clickMultiplier || 1;
    const clickValue = Math.floor(baseClickValue * multiplier);
    
    // Обновляем статистику и ресурсы
    await ctx.db.patch(args.userId, {
      energons: user.energons + clickValue,
      totalClicks: user.totalClicks + 1,
      manualClicks: user.manualClicks + 1,
      lastActivity: Date.now(),
    });
    
    // Записываем статистику клика
    await ctx.db.insert("statistics", {
      userId: args.userId,
      event: "manual_click",
      value: clickValue,
      timestamp: Date.now(),
    });
    
    return { energons: user.energons + clickValue, clickValue };
  },
});

// Изменяем тип мутации с internalMutation на обычный mutation
export const lazyEvaluateResources = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }
    
    const now = Date.now();
    const timeElapsed = now - user.lastActivity;
    
    // Если прошло менее 1 секунды, не пересчитываем
    if (timeElapsed < 1000) {
      return {
        energons: user.energons,
        neutrons: user.neutrons,
        particles: user.particles,
        lastActivity: user.lastActivity
      };
    }
    
    // Получаем все активные комплексы пользователя
    const complexes = await ctx.db
      .query("complexes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    
    // Получаем активные бустеры
    const boosters = await ctx.db
      .query("boosters")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gt(q.field("endTime"), now))
      .collect();
    
    // Рассчитываем базовое производство по типам ресурсов
    let baseEnergonProduction = 0;
    let baseNeutronProduction = 0;
    let baseParticleProduction = 0;
    
    for (const complex of complexes) {
      // Проверяем тип комплекса и соответствующее производство
      if (complex.type === "KOLLEKTIV-1" || complex.type === "ZARYA-M") {
        baseEnergonProduction += complex.production;
      } else if (complex.type === "SOYUZ-ATOM") {
        baseNeutronProduction += complex.production;
      } else if (complex.type === "KVANT-SIBIR") {
        baseParticleProduction += complex.production;
      }
    }
    
    // Рассчитываем множители от бустеров
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
    
    // Вычисляем время в секундах
    const secondsElapsed = timeElapsed / 1000;
    
    // Рассчитываем прирост ресурсов
    const energonProduction = baseEnergonProduction * energonMultiplier;
    const neutronProduction = baseNeutronProduction * neutronMultiplier;
    const particleProduction = baseParticleProduction * particleMultiplier;
    
    const earnedEnergons = Math.floor(energonProduction * secondsElapsed);
    const earnedNeutrons = Math.floor(neutronProduction * secondsElapsed);
    const earnedParticles = Math.floor(particleProduction * secondsElapsed);
    
    // Обновляем ресурсы пользователя
    await ctx.db.patch(args.userId, {
      energons: user.energons + earnedEnergons,
      neutrons: user.neutrons + earnedNeutrons,
      particles: user.particles + earnedParticles,
      lastActivity: now,
      totalProduction: baseEnergonProduction,
      totalNeutronProduction: baseNeutronProduction,
      totalParticleProduction: baseParticleProduction,
    });
    
    // Записываем в историю изменений
    await ctx.db.insert("resourceHistory", {
      userId: args.userId,
      timestamp: now,
      energonsAdded: earnedEnergons,
      neutronsAdded: earnedNeutrons,
      particlesAdded: earnedParticles,
      timeElapsed: secondsElapsed,
      source: "lazy_evaluation",
      energonProduction,
      neutronProduction,
      particleProduction
    });
    
    return {
      energons: user.energons + earnedEnergons,
      neutrons: user.neutrons + earnedNeutrons,
      particles: user.particles + earnedParticles,
      earnedEnergons,
      earnedNeutrons,
      earnedParticles,
      energonProduction,
      neutronProduction,
      particleProduction,
      lastActivity: now
    };
  }
});

// Определим интерфейс для данных ресурсов
interface ResourceData {
  energons: number;
  neutrons: number;
  particles: number;
  lastActivity?: number;
  earnedEnergons?: number;
  earnedNeutrons?: number;
  earnedParticles?: number;
  energonProduction?: number;
  neutronProduction?: number;
  particleProduction?: number;
}

// В syncResources используем api.resources вместо syncResources
export const syncResources = mutation({
  args: { 
    userId: v.id("users"),
    clientTime: v.number(),
    clientEnergons: v.number(),
    clientNeutrons: v.number(),
    clientParticles: v.number(),
    isClosing: v.optional(v.boolean())
  },
  handler: async (ctx, args): Promise<{
    energons: number;
    neutrons: number;
    particles: number;
    serverTime: number;
  }> => {
    // Сначала выполняем ленивый пересчет на сервере
    const serverResources: ResourceData = await ctx.runMutation(api.resources.lazyEvaluateResources, {
      userId: args.userId
    });
    
    // Сверяем клиентские данные с серверными
    const updates: Record<string, unknown> = {
      lastSyncTime: Date.now()
    };
    
    // Используем максимальные значения, чтобы не терять прогресс клиента
    if (args.clientEnergons > serverResources.energons) {
      updates.energons = args.clientEnergons;
    }
    
    if (args.clientNeutrons > serverResources.neutrons) {
      updates.neutrons = args.clientNeutrons;
    }
    
    if (args.clientParticles > serverResources.particles) {
      updates.particles = args.clientParticles;
    }
    
    // Если есть обновления, применяем их
    if (Object.keys(updates).length > 1) {
      await ctx.db.patch(args.userId, updates);
      
      // Запись о синхронизации в историю
      await ctx.db.insert("resourceHistory", {
        userId: args.userId,
        timestamp: Date.now(),
        energonsAdded: updates.energons ? (updates.energons as number) - serverResources.energons : 0,
        neutronsAdded: updates.neutrons ? (updates.neutrons as number) - serverResources.neutrons : 0,
        particlesAdded: updates.particles ? (updates.particles as number) - serverResources.particles : 0,
        source: args.isClosing ? "app_closing_sync" : "manual_sync",
        metadata: JSON.stringify({ clientTime: args.clientTime }),
      });
    }
    
    return {
      energons: updates.energons as number || serverResources.energons,
      neutrons: updates.neutrons as number || serverResources.neutrons,
      particles: updates.particles as number || serverResources.particles,
      serverTime: Date.now()
    };
  }
});

// Обработка пакета ручных кликов для получения ресурсов
export const batchManualClicks = mutation({
  args: { 
    userId: v.id("users"), 
    clicks: v.number(),
    clientEnergons: v.optional(v.number()) // Добавляем текущее клиентское значение энергонов
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }
    
    const now = Date.now();
    
    // Расчет накопленного производства с момента последней активности
    const secondsElapsed = (now - user.lastActivity) / 1000;
    const productionMultiplier = user.productionMultiplier || 1;
    const productionRate = user.totalProduction * productionMultiplier;
    const autoProduction = Math.floor(productionRate * secondsElapsed);
    
    // Расчет дохода от кликов
    const baseClickValue = 1;
    const clickMultiplier = user.clickMultiplier || 1;
    const clickValue = Math.floor(baseClickValue * clickMultiplier * args.clicks);
    
    // Общий доход (автоматический + от кликов)
    const totalEarned = autoProduction + clickValue;
    
    // Если клиент отправил текущее значение, сравниваем его с расчетным сервером
    let finalEnergons = user.energons + totalEarned;
    if (args.clientEnergons && args.clientEnergons > finalEnergons) {
      finalEnergons = args.clientEnergons;
    }
    
    // Обновляем статистику и ресурсы
    await ctx.db.patch(args.userId, {
      energons: finalEnergons,
      totalClicks: user.totalClicks + args.clicks,
      manualClicks: user.manualClicks + args.clicks,
      lastActivity: now,
    });
    
    // Записываем статистику пакета кликов
    await ctx.db.insert("statistics", {
      userId: args.userId,
      event: "batch_clicks",
      value: totalEarned,
      timestamp: now,
      metadata: JSON.stringify({
        clickCount: args.clicks,
        clickValue,
        autoProduction,
        multiplier: clickMultiplier
      }),
    });
    
    return { 
      energons: finalEnergons,
      clickValue,
      autoProduction,
      totalEarned,
      clickCount: args.clicks
    };
  },
});