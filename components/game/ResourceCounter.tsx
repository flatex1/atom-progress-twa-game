"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface ResourceCounterProps {
  userId: Id<"users">;
}

export default function ResourceCounter({ userId }: ResourceCounterProps) {
  // Состояние ресурсов
  const [energons, setEnergons] = useState(0);
  const [neutrons, setNeutrons] = useState(0);
  const [particles, setParticles] = useState(0);
  
  // Состояние для отслеживания производства
  const [productionRate, setProductionRate] = useState(0);
  const [animateEnergons, setAnimateEnergons] = useState(false);
  
  // Буфер для ручных кликов
  const clickBuffer = useRef(0);
  const lastSyncTime = useRef(Date.now());
  const lastResourceSnapshot = useRef({ energons: 0, neutrons: 0, particles: 0 });
  
  // Получение ресурсов пользователя
  const userResources = useQuery(api.users.getUserResourcesWithAccrual, {
    userId,
  });
  
  // Получение эффектов бустеров
  const boosterEffects = useQuery(api.boosters.getBoosterEffects, {
    userId,
  });
  
  // Мутации для взаимодействия с сервером
  const syncResources = useMutation(api.resources.syncResources);
  const collectClicks = useMutation(api.resources.batchManualClicks);
  
  // Обновляем снапшот ресурсов при получении данных с сервера
  useEffect(() => {
    if (userResources) {
      // Рассчитываем, сколько ресурсов должно было накопиться с момента последней синхронизации
      const now = Date.now();
      const secondsSinceLastSync = (now - lastSyncTime.current) / 1000;
      
      // Учитываем множители от бустеров
      let rate = userResources.totalProduction;
      if (boosterEffects?.effects.productionMultiplier) {
        rate *= boosterEffects.effects.productionMultiplier;
      }
      setProductionRate(rate);
      
      // Обновляем базовые значения с сервера + накопленные за время с последней синхронизации
      const accruedEnergons = rate * secondsSinceLastSync;
      
      setEnergons(userResources.energons + accruedEnergons);
      setNeutrons(userResources.neutrons);
      setParticles(userResources.particles);
      
      // Обновляем время последней синхронизации и снапшот ресурсов
      lastSyncTime.current = now;
      lastResourceSnapshot.current = {
        energons: userResources.energons,
        neutrons: userResources.neutrons,
        particles: userResources.particles
      };
    }
  }, [userResources, boosterEffects]);
  
  // Обновляем ресурсы в реальном времени на клиенте
  useEffect(() => {
    const timer = setInterval(() => {
      // Обновляем только клиентское представление ресурсов
      setEnergons(prevEnergons => prevEnergons + (productionRate / 10));
    }, 100); // Обновляем каждые 100мс для плавности
    
    return () => clearInterval(timer);
  }, [productionRate]);
  
  // Периодически синхронизируем ресурсы с сервером
  useEffect(() => {
    const syncTimer = setInterval(async () => {
      if (!userId) return;
      
      // Отправляем накопившиеся клики, если они есть
      if (clickBuffer.current > 0) {
        await handleSendClicks();
      }
      
      // Синхронизируем текущее состояние ресурсов
      try {
        const currentTime = Date.now();
        const secondsSinceLastSync = (currentTime - lastSyncTime.current) / 1000;
        
        // Только если прошло достаточно времени, синхронизируем
        if (secondsSinceLastSync > 5) {
          const result = await syncResources({
            userId,
            clientTime: currentTime,
            clientEnergons: Math.floor(energons)
          });
          
          if (result) {
            lastSyncTime.current = currentTime;
            // Обновляем данные после синхронизации, только если есть существенная разница
            if (Math.abs(result.energons - energons) > productionRate) {
              setEnergons(result.energons);
            }
            setNeutrons(result.neutrons);
            setParticles(result.particles);
          }
        }
      } catch (error) {
        console.error("Ошибка синхронизации ресурсов:", error);
      }
    }, 10000); // Синхронизация каждые 10 секунд
    
    return () => clearInterval(syncTimer);
  }, [userId, energons, productionRate, syncResources]);
  
  // Обработчик отправки накопленных кликов
  const handleSendClicks = useCallback(async () => {
    if (!userId || clickBuffer.current === 0) return;
    
    const clickCount = clickBuffer.current;
    clickBuffer.current = 0; // Сбрасываем буфер
    
    try {
      const result = await collectClicks({
        userId,
        clicks: clickCount
      });
      
      if (result) {
        console.log(`Отправлено ${clickCount} кликов, получено ${result.totalClickValue} энергонов`);
        
        // Обновляем состояние после синхронизации (уже учтено в энергонах)
        lastSyncTime.current = Date.now();
      }
    } catch (error) {
      console.error("Ошибка при обработке кликов:", error);
      // Возвращаем клики в буфер при ошибке
      clickBuffer.current += clickCount;
    }
  }, [userId, collectClicks]);
  
  // Буферизированный обработчик клика
  const handleClick = useCallback(() => {
    if (!userId) return;
    
    // Анимация обратной связи
    setAnimateEnergons(true);
    setTimeout(() => setAnimateEnergons(false), 500);
    
    // Увеличиваем буфер кликов
    clickBuffer.current++;
    
    // Обновляем локальное состояние для мгновенной обратной связи
    // Предполагаем базовое значение клика (фактическое значение определит сервер)
    const estimatedClickValue = 1; // Базовая оценка
    setEnergons(prevEnergons => prevEnergons + estimatedClickValue);
    
    // Отправляем клики на сервер через debounce
    if (clickBuffer.current === 1) {
      setTimeout(() => {
        handleSendClicks();
      }, 1000); // Отправляем пакет через 1 секунду неактивности
    }
  }, [userId, handleSendClicks]);
  
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