"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTelegram } from "@/components/providers/telegram-provider";

interface BoosterCardProps {
  booster: {
    type: string;
    name: string;
    description: string;
    duration: number;
    cost: {
      energons?: number;
      neutrons?: number;
      particles?: number;
    };
    isAvailable: boolean;
    requirements?: {
      requiredComplex: string;
      requiredLevel: number;
      complexName: string;
    };
  };
  userId: Id<"users">;
  userResources: {
    energons: number;
    neutrons: number;
    particles: number;
  };
}

export default function BoosterCard({ 
  booster, 
  userId,
  userResources 
}: BoosterCardProps) {
  const [isActivating, setIsActivating] = useState(false);
  const { showMainButton, hideMainButton } = useTelegram();
  
  const activateBooster = useMutation(api.boosters.activateBooster);
  
  // Оборачиваем в useCallback для предотвращения ненужных ререндеров
  const handleActivate = useCallback(async () => {
    if (!booster.isAvailable || isActivating) return;
    
    // Проверяем, достаточно ли ресурсов
    if (
      (booster.cost.energons && userResources.energons < booster.cost.energons) ||
      (booster.cost.neutrons && userResources.neutrons < booster.cost.neutrons) ||
      (booster.cost.particles && userResources.particles < booster.cost.particles)
    ) {
      alert("Недостаточно ресурсов для активации бустера");
      return;
    }
    
    try {
      setIsActivating(true);
      
      const result = await activateBooster({
        userId,
        boosterType: booster.type
      });
      
      if (result.effect === "instant") {
        alert(`Бустер ${booster.name} активирован! Добавлено ${result.resourcesAdded.toLocaleString()} энергонов`);
      } else {
        alert(`Бустер ${booster.name} активирован на ${formatDuration(booster.duration)}!`);
      }
    } catch (error) {
      console.error("Ошибка при активации бустера:", error);
      alert(`Ошибка активации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsActivating(false);
    }
  }, [activateBooster, booster, isActivating, setIsActivating, userId, userResources]);
  
  // Форматирование длительности
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} сек`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} мин`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} ч ${minutes > 0 ? `${minutes} мин` : ''}`;
    }
  };
  
  // Проверка, может ли пользователь позволить себе бустер
  const canAfford = useCallback((): boolean => {
    return !(
      (booster.cost.energons && userResources.energons < booster.cost.energons) ||
      (booster.cost.neutrons && userResources.neutrons < booster.cost.neutrons) ||
      (booster.cost.particles && userResources.particles < booster.cost.particles)
    );
  }, [booster.cost, userResources]);
  
  // Настройка кнопки Telegram при монтировании компонента
  useEffect(() => {
    if (booster.isAvailable && canAfford() && !isActivating) {
      showMainButton(`АКТИВИРОВАТЬ ${booster.name}`, handleActivate);
      return () => hideMainButton();
    }
    
    return () => hideMainButton();
  }, [
    booster, 
    userResources, 
    isActivating, 
    canAfford, 
    handleActivate, 
    hideMainButton, 
    showMainButton, 
    booster.name, 
    booster.isAvailable
  ]);
  
  // Получаем строку с требованиями, если они есть и не выполнены
  const getRequirementsText = (): string | null => {
    if (!booster.requirements || booster.isAvailable) return null;
    
    return `Требуется: ${booster.requirements.complexName} уровня ${booster.requirements.requiredLevel}`;
  };
  
  return (
    <div 
      className={`bg-gray-800 rounded-lg p-4 mb-4 ${
        !booster.isAvailable ? 'opacity-70' : ''
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-white">{booster.name}</h3>
          <p className="text-sm text-gray-300 mt-1">{booster.description}</p>
          
          {booster.duration > 1 && (
            <p className="text-xs text-blue-300 mt-1">
              Длительность: {formatDuration(booster.duration)}
            </p>
          )}
          
          <div className="mt-2 space-y-1">
            {booster.cost.energons && (
              <p className={`text-xs ${userResources.energons >= booster.cost.energons ? 'text-yellow-400' : 'text-red-400'}`}>
                {booster.cost.energons.toLocaleString()} энергонов
              </p>
            )}
            
            {booster.cost.neutrons && (
              <p className={`text-xs ${userResources.neutrons >= booster.cost.neutrons ? 'text-blue-400' : 'text-red-400'}`}>
                {booster.cost.neutrons.toLocaleString()} нейтронов
              </p>
            )}
            
            {booster.cost.particles && (
              <p className={`text-xs ${userResources.particles >= booster.cost.particles ? 'text-purple-400' : 'text-red-400'}`}>
                {booster.cost.particles.toLocaleString()} частиц
              </p>
            )}
          </div>
          
          {getRequirementsText() && (
            <p className="text-xs text-red-400 mt-2">{getRequirementsText()}</p>
          )}
        </div>
        
        <button
          className={`px-3 py-2 rounded text-sm ${
            !booster.isAvailable || !canAfford() || isActivating
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
          onClick={handleActivate}
          disabled={!booster.isAvailable || !canAfford() || isActivating}
        >
          {isActivating ? 'Активация...' : 'Активировать'}
        </button>
      </div>
    </div>
  );
}