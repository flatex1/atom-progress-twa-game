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