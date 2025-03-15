import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Интегральный пересчет ресурсов пользователя за указанный период
export const recalculateResources = mutation({
  args: { 
    userId: v.id("users"),
    startTime: v.number(),
    endTime: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }
    
    const endTimeValue = args.endTime || Date.now();
    
    // Получаем все комплексы пользователя на начало периода
    const complexes = await ctx.db
      .query("complexes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.lte(q.field("createdAt"), args.startTime))
      .collect();
    
    // Вычисляем базовое производство на начало периода
    let baseEnergonProduction = 0;
    let baseNeutronProduction = 0;
    let baseParticleProduction = 0;
    
    for (const complex of complexes) {
      if (complex.type === "KOLLEKTIV-1" || complex.type === "ZARYA-M") {
        baseEnergonProduction += complex.production;
      } else if (complex.type === "SOYUZ-ATOM") {
        baseNeutronProduction += complex.production;
      } else if (complex.type === "KVANT-SIBIR") {
        baseParticleProduction += complex.production;
      }
    }
    
    // Получаем изменения комплексов за период
    const complexChanges = await ctx.db
      .query("resourceHistory")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.gte(q.field("timestamp"), args.startTime) &&
        q.lte(q.field("timestamp"), endTimeValue) &&
        (q.eq(q.field("source"), "complex_purchase") || q.eq(q.field("source"), "complex_upgrade"))
      )
      .order("asc")
      .collect();
    
    // Рассчитываем интегральное производство с учетом изменений
    let totalEnergons = 0;
    let totalNeutrons = 0;
    let totalParticles = 0;
    
    let lastTimestamp = args.startTime;
    let currentEnergonProduction = baseEnergonProduction;
    let currentNeutronProduction = baseNeutronProduction;
    let currentParticleProduction = baseParticleProduction;
    
    // Проходим по всем изменениям комплексов в хронологическом порядке
    for (const change of complexChanges) {
      // Рассчитываем производство за интервал до текущего изменения
      const timeInterval = (change.timestamp - lastTimestamp) / 1000; // в секундах
      
      totalEnergons += currentEnergonProduction * timeInterval;
      totalNeutrons += currentNeutronProduction * timeInterval;
      totalParticles += currentParticleProduction * timeInterval;
      
      // Обновляем производство с учетом текущего изменения
      const metadata = JSON.parse(change.metadata || "{}");
      
      if (change.source === "complex_purchase") {
        // Обновляем производство в зависимости от типа комплекса
        if (metadata.complexType === "KOLLEKTIV-1" || metadata.complexType === "ZARYA-M") {
          currentEnergonProduction += metadata.production || 0;
        } else if (metadata.complexType === "SOYUZ-ATOM") {
          currentNeutronProduction += metadata.production || 0;
        } else if (metadata.complexType === "KVANT-SIBIR") {
          currentParticleProduction += metadata.production || 0;
        }
      } else if (change.source === "complex_upgrade") {
        // При улучшении комплекса нужно учесть разницу в производстве
        if (metadata.complexType === "KOLLEKTIV-1" || metadata.complexType === "ZARYA-M") {
          currentEnergonProduction += (metadata.newProduction || 0) - (metadata.oldProduction || 0);
        } else if (metadata.complexType === "SOYUZ-ATOM") {
          currentNeutronProduction += (metadata.newProduction || 0) - (metadata.oldProduction || 0);
        } else if (metadata.complexType === "KVANT-SIBIR") {
          currentParticleProduction += (metadata.newProduction || 0) - (metadata.oldProduction || 0);
        }
      }
      
      lastTimestamp = change.timestamp;
    }
    
    // Рассчитываем производство за оставшееся время до конца периода
    const finalTimeInterval = (endTimeValue - lastTimestamp) / 1000;
    
    totalEnergons += currentEnergonProduction * finalTimeInterval;
    totalNeutrons += currentNeutronProduction * finalTimeInterval;
    totalParticles += currentParticleProduction * finalTimeInterval;
    
    // Округляем значения
    totalEnergons = Math.floor(totalEnergons);
    totalNeutrons = Math.floor(totalNeutrons);
    totalParticles = Math.floor(totalParticles);
    
    return {
      startTime: args.startTime,
      endTime: endTimeValue,
      durationSeconds: (endTimeValue - args.startTime) / 1000,
      totalEnergons,
      totalNeutrons,
      totalParticles,
      finalEnergonProduction: currentEnergonProduction,
      finalNeutronProduction: currentNeutronProduction,
      finalParticleProduction: currentParticleProduction
    };
  }
}); 