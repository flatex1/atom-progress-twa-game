"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ComplexConfig } from "@/lib/types/complex";
import { calculateUpgradeCost } from "@/lib/utils/complex-utils";
import Image from "next/image";

interface ComplexCardProps {
  complex: {
    _id: Id<"complexes">;
    type: string;
    level: number;
    production: number;
    lastUpgraded: number;
  };
  config: ComplexConfig;
  userId: Id<"users">;
  isExpanded: boolean;
  onToggleExpand: () => void;
  userResources: {
    energons: number;
    neutrons: number;
    particles: number;
  };
}

export default function ComplexCard({
  complex,
  config,
  userId,
  isExpanded,
  onToggleExpand,
  userResources
}: ComplexCardProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  const upgradeComplex = useMutation(api.complexes.upgradeComplex);
  
  // Рассчитываем стоимость улучшения
  const upgradeCost = calculateUpgradeCost(complex.type, complex.level);
  
  // Проверяем, достаточно ли ресурсов для улучшения
  const canUpgrade = (): boolean => {
    return !(
      (upgradeCost.energons && userResources.energons < upgradeCost.energons) ||
      (upgradeCost.neutrons && userResources.neutrons < upgradeCost.neutrons) ||
      (upgradeCost.particles && userResources.particles < upgradeCost.particles)
    );
  };
  
  // Обработчик улучшения комплекса
  const handleUpgrade = async () => {
    if (isUpgrading || !canUpgrade()) return;
    
    try {
      setIsUpgrading(true);
      
      const result = await upgradeComplex({
        userId,
        complexId: complex._id
      });
      
      // Скрываем карточку после успешного улучшения
      if (result.level > complex.level) {
        // Можно добавить анимацию или звуковой эффект при успешном улучшении
      }
    } catch (error) {
      console.error("Ошибка при улучшении комплекса:", error);
      alert(`Ошибка улучшения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsUpgrading(false);
    }
  };
  
  // Расчет производства на следующем уровне
  const nextLevelProduction = config.baseProduction * (complex.level + 1);
  
  // Расчет дельты (прироста) производства
  const productionDelta = nextLevelProduction - complex.production;
  
  // Получаем иконку комплекса (если картинка задана)
  const complexImage = config.image ? config.image.replace('./public', '') : null;
  
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden mb-4">
      <div 
        className="p-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {complexImage && (
              <div className="w-10 h-10 mr-3 flex-shrink-0 bg-gray-700 rounded overflow-hidden">
                <Image
                  src={complexImage} 
                  alt={config.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  width={40}
                  height={40}
                />
              </div>
            )}
            
            <div>
              <h3 className="font-bold">{config.name}</h3>
              <p className="text-xs text-gray-400">Уровень {complex.level}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm font-bold text-green-400">
              {complex.production.toFixed(1)}/сек
            </div>
            <div className="text-xs text-gray-400">
              {isExpanded ? '▲ Свернуть' : '▼ Подробнее'}
            </div>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 border-t border-gray-700 bg-gray-850">
          <p className="text-sm text-gray-300 mb-4">{config.description}</p>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Производство:</span>
              <span className="text-green-400 font-bold">{complex.production.toFixed(1)} э/сек</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">След. уровень:</span>
              <span className="text-green-400 font-bold">
                {nextLevelProduction.toFixed(1)} э/сек
                <span className="text-green-600 text-xs ml-1">
                  (+{productionDelta.toFixed(1)})
                </span>
              </span>
            </div>
            
            <div className="mt-3 space-y-1">
              <div className="text-sm font-medium">Стоимость улучшения:</div>
              
              {upgradeCost.energons && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Энергоны:</span>
                  <span className={userResources.energons >= upgradeCost.energons ? 'text-yellow-400' : 'text-red-400'}>
                    {upgradeCost.energons.toLocaleString()}
                  </span>
                </div>
              )}
              
              {upgradeCost.neutrons && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Нейтроны:</span>
                  <span className={userResources.neutrons >= upgradeCost.neutrons ? 'text-blue-400' : 'text-red-400'}>
                    {upgradeCost.neutrons.toLocaleString()}
                  </span>
                </div>
              )}
              
              {upgradeCost.particles && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Частицы:</span>
                  <span className={userResources.particles >= upgradeCost.particles ? 'text-purple-400' : 'text-red-400'}>
                    {upgradeCost.particles.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            
            <button
              className={`w-full py-2 rounded-lg mt-3 ${
                isUpgrading || !canUpgrade()
                  ? "bg-gray-600 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isUpgrading && canUpgrade()) handleUpgrade();
              }}
              disabled={isUpgrading || !canUpgrade()}
            >
              {isUpgrading ? "Улучшение..." : "Улучшить"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}