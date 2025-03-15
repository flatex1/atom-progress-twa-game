import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { COMPLEX_CONFIGS } from "@/lib/config/game-config";
import { calculateProduction } from "@/lib/utils/complex-utils";
import { calculateUpgradeCost } from "@/lib/utils/complex-utils";
import { ResourceCost } from "@/lib/types/complex";

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
    const { userId, complexType } = args;

    // Проверяем, существует ли такой комплекс в конфигурации
    const complexConfig =
      COMPLEX_CONFIGS[complexType as keyof typeof COMPLEX_CONFIGS];
    if (!complexConfig) {
      throw new Error(`Неизвестный тип комплекса: ${complexType}`);
    }

    // Проверяем, есть ли у пользователя уже такой комплекс
    const existingComplex = await ctx.db
      .query("complexes")
      .withIndex("by_userAndType", (q) =>
        q.eq("userId", userId).eq("type", complexType)
      )
      .first();

    if (existingComplex) {
      throw new Error(`У вас уже есть комплекс ${complexConfig.name}`);
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
    // Проверяем требования для разблокировки комплекса
    if ('requiredComplex' in complexConfig && 'requiredLevel' in complexConfig) {
      const requiredComplex = userComplexes.find(
        (c) => c.type === complexConfig.requiredComplex
      );

      if (
        !requiredComplex ||
        requiredComplex.level < complexConfig.requiredLevel
      ) {
        throw new Error(
          `Для разблокировки ${complexConfig.name} требуется ${
            COMPLEX_CONFIGS[complexConfig.requiredComplex as keyof typeof COMPLEX_CONFIGS].name
          } уровня ${complexConfig.requiredLevel}`
        );
      }
    }

    // Проверяем, достаточно ли ресурсов
    const baseCost = complexConfig.baseCost;

    if (
      (baseCost.energons && user.energons < baseCost.energons) ||
      (baseCost.neutrons && user.neutrons < baseCost.neutrons) ||
      (baseCost.particles && user.particles < baseCost.particles)
    ) {
      throw new Error("Недостаточно ресурсов для создания комплекса");
    }

    // Списываем ресурсы
    await ctx.db.patch(userId, {
      energons: user.energons - (baseCost.energons || 0),
      neutrons: user.neutrons - (baseCost.neutrons || 0),
      particles: user.particles - (baseCost.particles || 0),
    });

    const now = Date.now();

    // Создаем новый комплекс
    const newComplexId = await ctx.db.insert("complexes", {
      userId,
      type: complexType,
      level: 1,
      production: complexConfig.baseProduction,
      lastUpgraded: now,
      createdAt: now,
    });

    // Обновляем общее производство пользователя
    await ctx.db.patch(userId, {
      totalProduction: user.totalProduction + complexConfig.baseProduction,
    });

    // Записываем статистику
    await ctx.db.insert("statistics", {
      userId,
      event: "complex_purchase",
      value: 1,
      timestamp: now,
      metadata: JSON.stringify({
        complexType,
        cost: baseCost,
      }),
    });

    return {
      complexId: newComplexId,
      complexType,
      production: complexConfig.baseProduction,
      cost: baseCost,
    };
  },
});

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
      totalProduction: user.totalProduction + productionIncrease,
    });

    // Обновляем комплекс
    await ctx.db.patch(args.complexId, {
      level: newLevel,
      production: newProduction,
      lastUpgraded: Date.now(),
    });

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
