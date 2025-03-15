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
  totalNeutronProduction?: number;
  totalParticleProduction?: number;
  lastActivity: number;
  productionMultiplier?: number;
  neutronMultiplier?: number;
  particleMultiplier?: number;
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
          
          // Рассчитываем множитель для разных ресурсов
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
          
          // Время, прошедшее с последней активности
          const timeElapsed = now - user.lastActivity;
          const secondsElapsed = Math.floor(timeElapsed / 1000);
          
          // Рассчитываем производство для разных ресурсов
          const energonProduction = user.totalProduction * energonMultiplier;
          const neutronProduction = (user.totalNeutronProduction || 0) * neutronMultiplier;
          const particleProduction = (user.totalParticleProduction || 0) * particleMultiplier;
          
          const earnedEnergons = Math.floor(energonProduction * secondsElapsed);
          const earnedNeutrons = Math.floor(neutronProduction * secondsElapsed);
          const earnedParticles = Math.floor(particleProduction * secondsElapsed);
          
          // Обновляем ресурсы пользователя
          await ctx.db.patch(user._id, {
            energons: user.energons + earnedEnergons,
            neutrons: user.neutrons + earnedNeutrons,
            particles: user.particles + earnedParticles,
            lastActivity: now
          });
          
          // Записываем в историю изменений
          await ctx.db.insert("resourceHistory", {
            userId: user._id,
            timestamp: now,
            energonsAdded: earnedEnergons,
            neutronsAdded: earnedNeutrons,
            particlesAdded: earnedParticles,
            timeElapsed: secondsElapsed,
            source: "cron_production",
            energonProduction,
            neutronProduction,
            particleProduction
          });
          
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