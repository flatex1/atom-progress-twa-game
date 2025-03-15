"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface ResourceCounterProps {
  userId: Id<"users">;
}

export default function ResourceCounter({ userId }: ResourceCounterProps) {
  const [energons, setEnergons] = useState(0);
  const [neutrons, setNeutrons] = useState(0);
  const [particles, setParticles] = useState(0);
  const [productionRate, setProductionRate] = useState(0);
  const [animateEnergons, setAnimateEnergons] = useState(false);
  
  // Получение ресурсов пользователя
  const userResources = useQuery(api.users.getUserResources, {
    userId,
  });
  
  // Получение эффектов бустеров
  const boosterEffects = useQuery(api.boosters.getBoosterEffects, {
    userId,
  });
  
  // Мутация для добавления ресурсов вручную (клик)
  const collectResources = useMutation(api.resources.manualClick);
  
  // Обновляем состояние компонента при изменении данных
  useEffect(() => {
    if (userResources) {
      setEnergons(userResources.energons);
      setNeutrons(userResources.neutrons);
      setParticles(userResources.particles);
      
      // Учитываем множители от бустеров
      let rate = userResources.totalProduction;
      if (boosterEffects?.effects.productionMultiplier) {
        rate *= boosterEffects.effects.productionMultiplier;
      }
      
      setProductionRate(rate);
      
      // Обновляем ресурсы в реальном времени
      const timer = setInterval(() => {
        setEnergons(prevEnergons => prevEnergons + (rate / 10));
      }, 100); // Обновляем каждые 100мс для плавности
      
      return () => clearInterval(timer);
    }
  }, [userResources, boosterEffects]);
  
  // Обработчик клика для сбора ресурсов вручную
  const handleClick = useCallback(async () => {
    if (!userId) return;
    
    setAnimateEnergons(true);
    setTimeout(() => setAnimateEnergons(false), 500);
    
    try {
      const result = await collectResources({ userId });
      if (result) {
        // Используем clickValue вместо collectedAmount
        setEnergons(prevEnergons => prevEnergons + result.clickValue);
      }
    } catch (error) {
      console.error("Ошибка при сборе ресурсов:", error);
    }
  }, [userId, collectResources]);
  
  // Форматирование числа с учетом десятичных знаков
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    } else if (Number.isInteger(num)) {
      return num.toString();
    } else {
      return num.toFixed(1);
    }
  };
  
  return (
    <div 
      id="resource-container"
      className="bg-gray-800 rounded-lg p-4 mb-6 relative overflow-hidden cursor-pointer"
      onClick={handleClick}
    >
      {/* Эффект анимации клика */}
      {animateEnergons && (
        <div className="absolute inset-0 bg-yellow-400 bg-opacity-20 animate-pulse"></div>
      )}
      
      <div className="text-center mb-2">
        <h2 className="text-lg text-white font-bold">Ресурсы</h2>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-700 rounded p-3 flex flex-col items-center">
          <span className="text-yellow-400 text-2xl font-bold">
            {formatNumber(Math.floor(energons))}
          </span>
          <span className="text-xs text-gray-300">энергонов</span>
        </div>
        
        <div className="bg-gray-700 rounded p-3 flex flex-col items-center">
          <span className="text-blue-400 text-2xl font-bold">
            {formatNumber(Math.floor(neutrons))}
          </span>
          <span className="text-xs text-gray-300">нейтронов</span>
        </div>
      </div>
      
      <div className="mt-3 flex justify-between items-center">
        <div className="bg-gray-700 rounded p-2 flex items-center">
          <span className="text-purple-400 text-lg font-bold mr-2">
            {formatNumber(Math.floor(particles))}
          </span>
          <span className="text-xs text-gray-300">частиц</span>
        </div>
        
        <div className="bg-gray-700 rounded p-2 flex items-center">
          <span className="text-green-400 text-lg font-bold mr-2">
            {formatNumber(productionRate)}
          </span>
          <span className="text-xs text-gray-300">э/сек</span>
        </div>
      </div>
      
      <div className="mt-4 text-center text-xs text-gray-400">
        Нажмите для ручного сбора энергонов
      </div>
    </div>
  );
}