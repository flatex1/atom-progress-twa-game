import { internalMutation } from "./_generated/server";

// Обработка истекших бустеров
export const processExpiredBoosters = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    
    // Получаем истекшие бустеры
    const expiredBoosters = await ctx.db
      .query("boosters")
      .filter((q) => q.lt(q.field("endTime"), now))
      .collect();
    
    console.log(`Найдено ${expiredBoosters.length} истекших бустеров`);
    
    // Обрабатываем каждый истекший бустер
    for (const booster of expiredBoosters) {
      try {
        // Получаем пользователя
        const user = await ctx.db.get(booster.userId);
        if (!user) continue;
        
        // Записываем событие истечения бустера
        await ctx.db.insert("statistics", {
          userId: booster.userId,
          event: "booster_expired",
          value: 0,
          timestamp: now,
          metadata: JSON.stringify({
            boosterId: booster._id,
            boosterType: booster.type,
            duration: (booster.endTime - booster.startTime) / 1000 / 60 // в минутах
          })
        });
        
        // Удаляем истекший бустер
        await ctx.db.delete(booster._id);
      } catch (error) {
        console.error(`Ошибка при обработке истекшего бустера ${booster._id}:`, error);
      }
    }
    
    return { processed: expiredBoosters.length };
  }
}); 