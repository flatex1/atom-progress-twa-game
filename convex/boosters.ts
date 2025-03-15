import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { BOOSTER_CONFIGS, COMPLEX_CONFIGS } from "../lib/config/game-config";
import { ResourceCost } from "@/lib/types/complex";

// Получение активных бустеров пользователя
export const getActiveBoosters = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db
      .query("boosters")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter(q => q.gt(q.field("endTime"), now))
      .collect();
  }
});

// Активация бустера
export const activateBooster = mutation({
  args: {
    userId: v.id("users"),
    boosterType: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, boosterType } = args;
    
    // Проверяем, существует ли такой бустер в конфигурации
    const boosterConfig = BOOSTER_CONFIGS[boosterType as keyof typeof BOOSTER_CONFIGS];
    if (!boosterConfig) {
      throw new Error(`Неизвестный тип бустера: ${boosterType}`);
    }
    
    // Получаем текущие ресурсы пользователя
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }
    
    // Получаем список комплексов пользователя для проверки требований
    const userComplexes = await ctx.db
      .query("complexes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    
    // Проверяем требования для активации бустера
    if (boosterConfig.requiredComplex && boosterConfig.requiredLevel) {
      const requiredComplex = userComplexes.find(
        c => c.type === boosterConfig.requiredComplex
      );
      
      if (!requiredComplex || requiredComplex.level < boosterConfig.requiredLevel) {
        throw new Error(
          `Для активации бустера ${boosterConfig.name} требуется ${
            BOOSTER_CONFIGS[boosterConfig.requiredComplex as keyof typeof BOOSTER_CONFIGS].name
          } уровня ${boosterConfig.requiredLevel}`
        );
      }
    }
    
    // Проверяем, достаточно ли ресурсов
    const cost = boosterConfig.cost;
    
    if (
      (cost.energons && user.energons < cost.energons) ||
      (cost.neutrons && user.neutrons < cost.neutrons) ||
      (cost.particles && user.particles < cost.particles)
    ) {
      throw new Error("Недостаточно ресурсов для активации бустера");
    }
    
    // Списываем ресурсы
    await ctx.db.patch(userId, {
      energons: user.energons - (cost.energons || 0),
      neutrons: user.neutrons - (cost.neutrons || 0),
      particles: user.particles - (cost.particles || 0),
    });
    
    const now = Date.now();
    const startTime = now;
    
    // Проверяем, если это бустер с мгновенным эффектом (добавлена проверка isInstantBooster)
    if (boosterConfig.isInstantBooster) {
      // Рассчитываем эквивалент 24 часов производства
      const productionBonus = user.totalProduction * 24 * 60 * 60; // 24 часа в секундах
      
      // Добавляем ресурсы напрямую
      await ctx.db.patch(userId, {
        energons: user.energons + productionBonus,
      });
      
      // Записываем статистику
      await ctx.db.insert("statistics", {
        userId,
        event: "booster_instant",
        value: productionBonus,
        timestamp: now,
        metadata: JSON.stringify({
          boosterType,
          cost,
        }),
      });
      
      return {
        boosterType,
        effect: "instant",
        resourcesAdded: productionBonus,
      };
    }
    
    // Для обычных бустеров создаем запись с длительностью
    const endTime = startTime + boosterConfig.duration * 1000; // конвертируем секунды в миллисекунды
    
    // Создаем запись о бустере (использование affectsResource из конфигурации)
    const boosterId = await ctx.db.insert("boosters", {
      userId,
      type: boosterType,
      startTime,
      endTime,
      multiplier: boosterConfig.multiplier,
      affectsResource: boosterConfig.affectsResource || "all",
    });
    
    // Для некоторых бустеров может потребоваться обновить множители пользователя
    if (boosterType === "PROTON-M87") {
      // Обновляем производственный множитель пользователя
      // Это упрощенная логика, в реальности нужно учитывать комбинацию бустеров
      await ctx.db.patch(userId, {
        productionMultiplier: Math.max(
          user.productionMultiplier || 1,
          boosterConfig.multiplier
        ),
      });
    }
    
    // Записываем статистику
    await ctx.db.insert("statistics", {
      userId,
      event: "booster_activation",
      value: 1,
      timestamp: now,
      metadata: JSON.stringify({
        boosterType,
        cost,
        duration: boosterConfig.duration,
        endTime,
      }),
    });
    
    return {
      boosterId,
      boosterType,
      startTime,
      endTime,
      duration: boosterConfig.duration,
    };
  }
});

// Получение доступных для активации бустеров
export const getAvailableBoosters = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Получаем текущие комплексы пользователя
    const userComplexes = await ctx.db
      .query("complexes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    
    // Создаем карту уровней комплексов
    const complexLevels: Record<string, number> = {};
    userComplexes.forEach(complex => {
      complexLevels[complex.type] = complex.level;
    });
    
    const result: {
      type: string;
      name: string;
      description: string;
      duration: number;
      cost: ResourceCost;
      isAvailable: boolean;
      requirements?: {
        requiredComplex: string;
        requiredLevel: number;
        complexName: string;
      };
    }[] = [];
    
    // Проверяем все бустеры из конфигурации
    Object.entries(BOOSTER_CONFIGS).forEach(([type, config]) => {
      const isAvailable = !config.requiredComplex || 
        (complexLevels[config.requiredComplex] && 
         complexLevels[config.requiredComplex] >= config.requiredLevel);
      
      let requirements;
      if (config.requiredComplex && config.requiredLevel) {
        requirements = {
          requiredComplex: config.requiredComplex,
          requiredLevel: config.requiredLevel,
          complexName: COMPLEX_CONFIGS[config.requiredComplex as keyof typeof COMPLEX_CONFIGS]?.name || config.requiredComplex
        };
      }
      
      result.push({
        type,
        name: config.name,
        description: config.description,
        duration: config.duration,
        cost: config.cost,
        isAvailable: Boolean(isAvailable),
        requirements
      });
    });
    
    return result;
  }
});

// Получение текущих эффектов бустеров для пользователя
export const getBoosterEffects = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const activeBoosters = await ctx.db
      .query("boosters")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter(q => q.gt(q.field("endTime"), Date.now()))
      .collect();
    
    // Расчет множителей для разных типов эффектов с учетом affectsResource
    let energonMultiplier = 1.0;
    let neutronMultiplier = 1.0;
    let particleMultiplier = 1.0;
    const clickMultiplier = 1.0;
    let autoCollectionActive = false;
    
    activeBoosters.forEach(booster => {
      const config = BOOSTER_CONFIGS[booster.type as keyof typeof BOOSTER_CONFIGS];
      if (!config) return;
      
      // Применяем множители в зависимости от типа ресурса
      if (booster.affectsResource === "energons" || booster.affectsResource === "all") {
        energonMultiplier *= booster.multiplier;
      }
      
      if (booster.affectsResource === "neutrons" || booster.affectsResource === "all") {
        neutronMultiplier *= booster.multiplier;
      }
      
      if (booster.affectsResource === "particles" || booster.affectsResource === "all") {
        particleMultiplier *= booster.multiplier;
      }
      
      // Проверяем специальные эффекты
      if (config.specialEffect === "auto_collect") {
        autoCollectionActive = true;
      }
    });
    
    return {
      activeBoosters,
      effects: {
        energonMultiplier,
        neutronMultiplier,
        particleMultiplier,
        clickMultiplier,
        autoCollectionActive
      }
    };
  }
});

// Отменить действие бустера (если предусмотрена такая возможность)
export const cancelBooster = mutation({
  args: {
    userId: v.id("users"),
    boosterId: v.id("boosters")
  },
  handler: async (ctx, args) => {
    const { userId, boosterId } = args;
    
    // Проверяем, существует ли бустер и принадлежит ли он пользователю
    const booster = await ctx.db.get(boosterId);
    if (!booster || booster.userId !== userId) {
      throw new Error("Бустер не найден или доступ запрещен");
    }
    
    // Проверяем, можно ли отменить этот тип бустера
    // Некоторые бустеры, особенно с мгновенным эффектом, отменить нельзя
    if (booster.type === "RED-STAR") {
      throw new Error("Бустер с мгновенным эффектом нельзя отменить");
    }
    
    // Для бустера с длительным эффектом - завершаем его действие
    await ctx.db.patch(boosterId, {
      endTime: Date.now()
    });
    
    // Обновляем множители пользователя, если необходимо
    // Здесь должна быть более сложная логика для учета других активных бустеров
    const activeBoosters = await ctx.db
      .query("boosters")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter(q => q.gt(q.field("endTime"), Date.now()))
      .collect();
    
    // Пересчитываем множители на основе оставшихся бустеров
    let newProductionMultiplier = 1.0;
    activeBoosters.forEach(b => {
      if (b.type === "PROTON-M87") {
        newProductionMultiplier *= BOOSTER_CONFIGS[b.type].multiplier;
      }
    });
    
    // Обновляем множители пользователя
    await ctx.db.patch(userId, {
      productionMultiplier: newProductionMultiplier
    });
    
    return {
      status: "cancelled",
      boosterId
    };
  }
});

// Получение истории активации бустеров
export const getBoosterHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const { userId, limit = 10 } = args;
    
    // Получаем историю из статистики
    const boosterEvents = await ctx.db
      .query("statistics")
      .withIndex("by_userAndEvent", (q) => 
        q.eq("userId", userId).eq("event", "booster_activation"))
      .order("desc")
      .take(limit);
    
    const boosterInstantEvents = await ctx.db
      .query("statistics")
      .withIndex("by_userAndEvent", (q) => 
        q.eq("userId", userId).eq("event", "booster_instant"))
      .order("desc")
      .take(limit);
    
    // Объединяем и сортируем по времени
    const allEvents = [...boosterEvents, ...boosterInstantEvents]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
    return allEvents.map(event => {
      let metadata = {};
      try {
        metadata = JSON.parse(event.metadata || "{}");
      } catch {
        // Игнорируем ошибки при парсинге
      }
      
      return {
        ...event,
        parsedMetadata: metadata,
        boosterName: BOOSTER_CONFIGS[(metadata as { boosterType?: string }).boosterType as keyof typeof BOOSTER_CONFIGS]?.name || "Неизвестный бустер"
      };
    });
  }
});

// Получение прогресса разблокировки бустеров
export const getBoosterUnlockProgress = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Получаем текущие комплексы пользователя
    const userComplexes = await ctx.db
      .query("complexes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    
    // Создаем карту уровней комплексов
    const complexLevels: Record<string, number> = {};
    userComplexes.forEach(complex => {
      complexLevels[complex.type] = complex.level;
    });
    
    const unlockProgress = Object.entries(BOOSTER_CONFIGS).map(([type, config]) => {
      const requiredComplexLevel = complexLevels[config.requiredComplex] || 0;
      const requiredLevel = config.requiredLevel || 1;
      
      return {
        type,
        name: config.name,
        requiredComplex: config.requiredComplex,
        requiredComplexName: COMPLEX_CONFIGS[config.requiredComplex as keyof typeof COMPLEX_CONFIGS]?.name || config.requiredComplex,
        requiredLevel,
        currentLevel: requiredComplexLevel,
        progress: Math.min(100, (requiredComplexLevel / requiredLevel) * 100),
        isUnlocked: requiredComplexLevel >= requiredLevel
      };
    });
    
    return unlockProgress;
  }
});