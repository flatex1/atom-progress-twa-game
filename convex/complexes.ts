import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { COMPLEX_CONFIGS } from "@/lib/config/game-config";
import { calculateProduction } from "@/lib/utils/complex-utils";
import { calculateUpgradeCost } from "@/lib/utils/complex-utils";
import { ResourceCost } from "@/lib/types/complex";
import { Id } from "./_generated/dataModel";

// Получение всех комплексов пользователя
export const getUserComplexes = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complexes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Инициализация начальных комплексов для нового пользователя
export const initializeUserComplexes = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existingComplexes = await ctx.db
      .query("complexes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Если у пользователя уже есть комплексы, ничего не делаем
    if (existingComplexes.length > 0) {
      return { status: "already_initialized" };
    }

    const now = Date.now();
    const initialComplex = "KOLLEKTIV-1"; // Первый комплекс, доступный всем
    const complexConfig = COMPLEX_CONFIGS[initialComplex];

    if (!complexConfig) {
      throw new Error(
        `Не найдена конфигурация для комплекса ${initialComplex}`
      );
    }

    // Создаем первый комплекс
    const complexId = await ctx.db.insert("complexes", {
      userId: args.userId,
      type: initialComplex,
      level: 1,
      production: complexConfig.baseProduction,
      lastUpgraded: now,
      createdAt: now,
    });

    // Обновляем общее производство пользователя
    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.patch(args.userId, {
        totalProduction: complexConfig.baseProduction,
      });
    }

    return {
      status: "success",
      complexId,
      complexType: initialComplex,
      production: complexConfig.baseProduction,
    };
  },
});

// Создание нового комплекса
export const purchaseComplex = mutation({
  args: {
    userId: v.id("users"),
    complexType: v.string(),
  },
  handler: async (ctx, args) => {
    // Получаем пользователя
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }
    
    // Получаем конфигурацию комплекса
    const complexConfig = COMPLEX_CONFIGS[args.complexType as keyof typeof COMPLEX_CONFIGS];
    if (!complexConfig) {
      throw new Error("Неверный тип комплекса");
    }
    
    // Проверяем достаточно ли ресурсов
    if (user.energons < complexConfig.baseCost.energons || 
        user.neutrons < complexConfig.baseCost.neutrons || 
        user.particles < complexConfig.baseCost.particles) {
      throw new Error("Недостаточно ресурсов для покупки");
    }
    
    // Проверяем предварительные условия (если есть)
    if ('requiredComplex' in complexConfig) {
      const requiredComplex = await ctx.db
        .query("complexes")
        .withIndex("by_userAndType", (q) => 
          q.eq("userId", args.userId).eq("type", complexConfig.requiredComplex))
        .first();
        
      if (!requiredComplex || requiredComplex.level < complexConfig.requiredLevel) {
        throw new Error("Не выполнены предварительные условия для покупки");
      }
    }
    
    // Списываем ресурсы
    await ctx.db.patch(args.userId, {
      energons: user.energons - complexConfig.baseCost.energons,
      neutrons: user.neutrons - complexConfig.baseCost.neutrons,
      particles: user.particles - complexConfig.baseCost.particles
    });
    
    // Создаем комплекс
    const complexId = await ctx.db.insert("complexes", {
      userId: args.userId,
      type: args.complexType,
      level: 1,
      production: complexConfig.baseProduction,
      createdAt: Date.now(),
      lastUpgraded: Date.now()
    });
    
    // Обновляем общее производство пользователя
    await updateUserProduction(ctx, args.userId);
    
    // Записываем в историю
    await ctx.db.insert("resourceHistory", {
      userId: args.userId,
      timestamp: Date.now(),
      energonsAdded: -complexConfig.baseCost.energons,
      neutronsAdded: -complexConfig.baseCost.neutrons,
      particlesAdded: -complexConfig.baseCost.particles,
      source: "complex_purchase",
      metadata: JSON.stringify({
        complexType: args.complexType,
        complexName: complexConfig.name,
        level: 1
      })
    });
    
    return { 
      complexId,
      remainingEnergons: user.energons - complexConfig.baseCost.energons,
      remainingNeutrons: user.neutrons - complexConfig.baseCost.neutrons,
      remainingParticles: user.particles - complexConfig.baseCost.particles
    };
  }
});

// Обновление общего производства пользователя
async function updateUserProduction(ctx: MutationCtx, userId: Id<"users">) {
  // Получаем все комплексы пользователя
  const complexes = await ctx.db
    .query("complexes")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  
  // Рассчитываем общее производство для каждого типа ресурсов
  let totalEnergonProduction = 0;
  let totalNeutronProduction = 0;
  let totalParticleProduction = 0;
  
  for (const complex of complexes) {
    // Проверяем тип комплекса для определения типа производимого ресурса
    if (complex.type === "KOLLEKTIV-1" || complex.type === "ZARYA-M") {
      totalEnergonProduction += complex.production;
    } else if (complex.type === "SOYUZ-ATOM") {
      totalNeutronProduction += complex.production;
    } else if (complex.type === "KVANT-SIBIR") {
      totalParticleProduction += complex.production;
    }
  }
  
  // Обновляем производство пользователя
  await ctx.db.patch(userId, {
    totalProduction: totalEnergonProduction,
    totalNeutronProduction: totalNeutronProduction,
    totalParticleProduction: totalParticleProduction,
    lastActivity: Date.now()
  });
  
  return {
    totalEnergonProduction,
    totalNeutronProduction,
    totalParticleProduction
  };
}

// Экспортируем функцию для использования в других модулях
export { updateUserProduction };

// Улучшение комплекса
export const upgradeComplex = mutation({
  args: {
    userId: v.id("users"),
    complexId: v.id("complexes"),
  },
  handler: async (ctx, args) => {
    const complex = await ctx.db.get(args.complexId);
    if (!complex || complex.userId !== args.userId) {
      throw new Error("Комплекс не найден или не принадлежит пользователю");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }

    // Расчет стоимости улучшения
    const upgradeCost = calculateUpgradeCost(complex.type, complex.level);

    // Проверка достаточности ресурсов
    if (
      (upgradeCost.energons && user.energons < upgradeCost.energons) ||
      (upgradeCost.neutrons && user.neutrons < upgradeCost.neutrons) ||
      (upgradeCost.particles && user.particles < upgradeCost.particles)
    ) {
      throw new Error("Недостаточно ресурсов для улучшения");
    }

    // Расчет нового производства
    const currentProduction = complex.production;
    const newLevel = complex.level + 1;
    const newProduction = calculateProduction(complex.type, newLevel);
    const productionIncrease = newProduction - currentProduction;

    // Списываем ресурсы
    await ctx.db.patch(args.userId, {
      energons: user.energons - (upgradeCost.energons || 0),
      neutrons: user.neutrons - (upgradeCost.neutrons || 0),
      particles: user.particles - (upgradeCost.particles || 0),
    });

    // Обновляем комплекс
    await ctx.db.patch(args.complexId, {
      level: newLevel,
      production: newProduction,
      lastUpgraded: Date.now(),
    });

    // Обновляем общее производство для всех типов ресурсов
    await updateUserProduction(ctx, args.userId);

    // Записываем статистику
    await ctx.db.insert("statistics", {
      userId: args.userId,
      event: "complex_upgrade",
      value: newLevel,
      timestamp: Date.now(),
      metadata: JSON.stringify({
        complexType: complex.type,
        cost: upgradeCost,
        productionIncrease,
      }),
    });
    
    // Записываем в историю ресурсов
    await ctx.db.insert("resourceHistory", {
      userId: args.userId,
      timestamp: Date.now(),
      energonsAdded: -(upgradeCost.energons || 0),
      neutronsAdded: -(upgradeCost.neutrons || 0),
      particlesAdded: -(upgradeCost.particles || 0),
      source: "complex_upgrade",
      metadata: JSON.stringify({
        complexType: complex.type,
        complexName: COMPLEX_CONFIGS[complex.type as keyof typeof COMPLEX_CONFIGS]?.name,
        level: newLevel,
        oldProduction: currentProduction,
        newProduction: newProduction,
        productionIncrease: productionIncrease
      })
    });

    return {
      level: newLevel,
      production: newProduction,
      cost: upgradeCost,
      productionIncrease,
    };
  },
});

// Получение доступных для покупки комплексов
export const getAvailableComplexes = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Получаем текущие комплексы пользователя
    const userComplexes = await ctx.db
      .query("complexes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Создаем карту уровней комплексов
    const complexLevels: Record<string, number> = {};
    userComplexes.forEach((complex) => {
      complexLevels[complex.type] = complex.level;
    });

    const result: {
      type: string;
      name: string;
      description: string;
      baseCost: ResourceCost;
      isAvailable: boolean;
      requirements?: {
        requiredComplex: string;
        requiredLevel: number;
        complexName: string;
      };
    }[] = [];

    // Проверяем все комплексы из конфигурации
    Object.entries(COMPLEX_CONFIGS).forEach(([type, config]) => {
      // Если у пользователя уже есть этот комплекс, пропускаем
      if (complexLevels[type]) return;

      const isAvailable =
        !('requiredComplex' in config) ||
        (complexLevels[config.requiredComplex as keyof typeof complexLevels] &&
          complexLevels[config.requiredComplex as keyof typeof complexLevels] >= (config.requiredLevel || 0));

      let requirements;
      if ('requiredComplex' in config && 'requiredLevel' in config) {
        requirements = {
          requiredComplex: config.requiredComplex,
          requiredLevel: config.requiredLevel,
          complexName:
            COMPLEX_CONFIGS[config.requiredComplex as keyof typeof COMPLEX_CONFIGS]?.name ||
            config.requiredComplex,
        };
      }

      result.push({
        type,
        name: config.name,
        description: config.description,
        baseCost: config.baseCost,
        isAvailable: Boolean(isAvailable),
        requirements,
      });
    });

    return result;
  },
});
