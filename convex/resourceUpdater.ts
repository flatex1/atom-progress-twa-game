import { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

// Определяем явный интерфейс User вместо {[key: string]: any}
interface User {
  _id: Id<"users">;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  energons: number;
  neutrons: number;
  particles: number;
  totalProduction: number;
  lastActivity: number;
  productionMultiplier?: number;
}

// Обновление ресурсов всех пользователей
export const updateAllUsersResources = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const batchSize = 100;
    let processed = 0;
    let hasMore = true;
    let cursor = null;
    
    console.log("Запуск обновления ресурсов пользователей");
    
    while (hasMore) {
      // Используем определенный интерфейс в запросе
      const usersQuery: {
        page: User[];
        continueCursor: string | null;
      } = cursor 
        ? await ctx.db.query("users").paginate({ cursor, numItems: batchSize })
        : await ctx.db.query("users").paginate({ numItems: batchSize, cursor: null });
      
      const users = usersQuery.page;
      cursor = usersQuery.continueCursor;
      hasMore = usersQuery.continueCursor !== null;
      
      // Обрабатываем каждого пользователя
      for (const user of users) {
        try {
          // Получаем активные бустеры пользователя
          const boosters = await ctx.db
            .query("boosters")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .filter((q) => q.gt(q.field("endTime"), now))
            .collect();
          
          // Рассчитываем множитель от активных бустеров
          const productionMultiplier = boosters.reduce((multiplier, booster) => {
            if (booster.type === "production") {
              return multiplier * booster.multiplier;
            }
            return multiplier;
          }, user.productionMultiplier || 1);
          
          // Время, прошедшее с последней активности
          const timeElapsed = now - user.lastActivity;
          const secondsElapsed = Math.floor(timeElapsed / 1000);
          
          // Рассчитываем производство за период
          const production = user.totalProduction * productionMultiplier;
          const earnedEnergons = Math.floor(production * secondsElapsed);
          
          // Обновляем ресурсы пользователя
          await ctx.db.patch(user._id, {
            energons: user.energons + earnedEnergons,
            lastActivity: now
          });
          
          // Записываем в статистику, если прирост значительный
          if (earnedEnergons > 0) {
            await ctx.db.insert("statistics", {
              userId: user._id,
              event: "cron_production",
              value: earnedEnergons,
              timestamp: now,
              metadata: JSON.stringify({
                secondsElapsed,
                productionRate: production
              })
            });
          }
          
          processed++;
        } catch (error) {
          console.error(`Ошибка при обновлении ресурсов пользователя ${user._id}:`, error);
        }
      }
    }
    
    console.log(`Обновление ресурсов завершено, обработано ${processed} пользователей`);
    return { processed };
  }
}); 