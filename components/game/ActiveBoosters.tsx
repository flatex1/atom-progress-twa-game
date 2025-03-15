"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { BOOSTER_CONFIGS } from "@/lib/config/game-config";

interface ActiveBoostersProps {
  userId: Id<"users">;
}

export default function ActiveBoosters({ userId }: ActiveBoostersProps) {
  const [now, setNow] = useState(Date.now());
  
  // Получаем активные бустеры
  const activeBoosters = useQuery(api.boosters.getActiveBoosters, {
    userId,
  });
  
  // Получаем эффекты бустеров
  const boosterEffects = useQuery(api.boosters.getBoosterEffects, {
    userId,
  });
  
  // Обновляем текущее время каждую секунду
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Форматирование оставшегося времени
  const formatTimeLeft = (endTime: number): string => {
    const timeLeftMs = Math.max(0, endTime - now);
    const seconds = Math.floor(timeLeftMs / 1000) % 60;
    const minutes = Math.floor(timeLeftMs / (1000 * 60)) % 60;
    const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
    
    if (hours > 0) {
      return `${hours}ч ${minutes}м ${seconds}с`;
    } else if (minutes > 0) {
      return `${minutes}м ${seconds}с`;
    } else {
      return `${seconds}с`;
    }
  };
  
  if (!activeBoosters || activeBoosters.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h3 className="text-lg text-white font-bold mb-2">Текущие научные разработки</h3>
        <p className="text-gray-400 text-sm">
          У вас нет активных разработок. Активируйте их для получения временных бонусов.
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-6">
      <h3 className="text-lg text-white font-bold mb-3">Текущие научные разработки</h3>
      
      {boosterEffects && (
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          {boosterEffects.effects.energonMultiplier > 1 && (
            <div className="bg-gray-700 rounded p-2">
              <span className="text-green-400">+{((boosterEffects.effects.energonMultiplier - 1) * 100).toFixed(0)}%</span> к производству
            </div>
          )}
          
          {boosterEffects.effects.clickMultiplier > 1 && (
            <div className="bg-gray-700 rounded p-2">
              <span className="text-yellow-400">+{((boosterEffects.effects.clickMultiplier - 1) * 100).toFixed(0)}%</span> к кликам
            </div>
          )}
          
          {boosterEffects.effects.neutronMultiplier > 1 && (
            <div className="bg-gray-700 rounded p-2">
              <span className="text-blue-400">+{((boosterEffects.effects.neutronMultiplier - 1) * 100).toFixed(0)}%</span> к исследованиям
            </div>
          )}
          
          {boosterEffects.effects.particleMultiplier > 1 && (
            <div className="bg-gray-700 rounded p-2">
              <span className="text-purple-400">+{((boosterEffects.effects.particleMultiplier - 1) * 100).toFixed(0)}%</span> к стоимости
            </div>
          )}
          
          {boosterEffects.effects.autoCollectionActive && (
            <div className="bg-gray-700 rounded p-2">
              <span className="text-indigo-400">Автосбор</span> бонусов
            </div>
          )}
        </div>
      )}
      
      <div className="space-y-3">
        {activeBoosters.map((booster) => {
          const config = BOOSTER_CONFIGS[booster.type as keyof typeof BOOSTER_CONFIGS];
          if (!config) return null;
          
          return (
            <div key={booster._id} className="flex items-center justify-between">
              <div>
                <div className="font-medium">{config.name}</div>
                <div className="text-xs text-gray-400">{config.description}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-green-400">
                  {formatTimeLeft(booster.endTime)}
                </div>
                <div className="text-xs text-gray-400">
                  осталось
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}