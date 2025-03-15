import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Получение верхних игроков рейтинга
export const getTopPlayers = query({
  args: { 
    limit: v.number(),
    sortBy: v.union(v.literal("energons"), v.literal("totalProduction"))
  },
  handler: async (ctx, args) => {
    if (args.sortBy === "energons") {
      return await ctx.db
        .query("leaderboard")
        .withIndex("by_energons")
        .order("desc")
        .take(args.limit);
    } else {
      return await ctx.db
        .query("leaderboard")
        .withIndex("by_production")
        .order("desc")
        .take(args.limit);
    }
  }
});

// Обновление рейтинга для пользователя
export const updateLeaderboard = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }
    
    // Получаем все комплексы пользователя для рассчета общего уровня
    const complexes = await ctx.db
      .query("complexes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    
    const totalLevel = complexes.reduce((sum, complex) => sum + complex.level, 0);
    
    // Ищем существующую запись в рейтинге
    const existingEntry = await ctx.db
      .query("leaderboard")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    const now = Date.now();
    
    if (existingEntry) {
      // Обновляем существующую запись
      await ctx.db.patch(existingEntry._id, {
        energons: user.energons,
        totalLevel,
        totalProduction: user.totalProduction,
        username: user.username,
        firstName: user.firstName,
        updatedAt: now,
      });
      return existingEntry._id;
    } else {
      // Создаем новую запись
      return await ctx.db.insert("leaderboard", {
        userId: args.userId,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        energons: user.energons,
        totalLevel,
        totalProduction: user.totalProduction,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
});