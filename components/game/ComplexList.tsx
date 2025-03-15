"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import ComplexCard from "./ComplexCard";
import { Id } from "@/convex/_generated/dataModel";
import { COMPLEX_CONFIGS } from "@/lib/config/game-config";

interface ComplexListProps {
  userId: Id<"users">;
  userResources: {
    energons: number;
    neutrons: number;
    particles: number;
  };
}

export default function ComplexList({ userId, userResources }: ComplexListProps) {
  const [expandedComplex, setExpandedComplex] = useState<string | null>(null);
  
  // Получаем существующие комплексы пользователя
  const userComplexes = useQuery(api.complexes.getUserComplexes, {
    userId,
  });
  
  // Получаем доступные для покупки комплексы
  const availableComplexes = useQuery(api.complexes.getAvailableComplexes, {
    userId,
  });
  
  // Мутация для покупки нового комплекса
  const purchaseComplex = useMutation(api.complexes.purchaseComplex);
  
  // Обработчик для раскрытия/сворачивания карточки комплекса
  const handleToggleExpand = (complexType: string) => {
    if (expandedComplex === complexType) {
      setExpandedComplex(null);
    } else {
      setExpandedComplex(complexType);
    }
  };
  
  // Обработчик для покупки нового комплекса
  const handlePurchaseComplex = async (complexType: string) => {
    if (!confirm(`Вы уверены, что хотите приобрести комплекс ${COMPLEX_CONFIGS[complexType as keyof typeof COMPLEX_CONFIGS]?.name}?`)) {
      return;
    }
    
    try {
      await purchaseComplex({
        userId,
        complexType
      });
      
      // Расширяем новый комплекс автоматически
      setExpandedComplex(complexType);
    } catch (error) {
      console.error("Ошибка при покупке комплекса:", error);
      alert(`Ошибка при покупке: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };
  
  if (!userComplexes) {
    return (
      <div className="py-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Загрузка...
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Научные комплексы</h2>
      
      {/* Существующие комплексы */}
      {userComplexes.map((complex) => {
        const config = COMPLEX_CONFIGS[complex.type as keyof typeof COMPLEX_CONFIGS];
        if (!config) return null;
        
        return (
          <ComplexCard
            key={complex._id}
            complex={complex}
            config={config}
            userId={userId}
            isExpanded={expandedComplex === complex.type}
            onToggleExpand={() => handleToggleExpand(complex.type)}
            userResources={userResources}
          />
        );
      })}
      
      {/* Доступные для покупки комплексы */}
      {availableComplexes && availableComplexes.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3 text-gray-300">
            Доступные комплексы
          </h3>
          
          {availableComplexes
            .filter(complex => complex.isAvailable)
            .map(complex => (
              <div key={complex.type} className="bg-gray-800 rounded-lg p-4 mb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold">{complex.name}</h4>
                    <p className="text-sm text-gray-400 mt-1">{complex.description}</p>
                    
                    <div className="mt-2 space-y-1">
                      {complex.baseCost.energons && (
                        <p className={`text-xs ${userResources.energons >= complex.baseCost.energons ? 'text-yellow-400' : 'text-red-400'}`}>
                          {complex.baseCost.energons.toLocaleString()} энергонов
                        </p>
                      )}
                      
                      {complex.baseCost.neutrons && (
                        <p className={`text-xs ${userResources.neutrons >= complex.baseCost.neutrons ? 'text-blue-400' : 'text-red-400'}`}>
                          {complex.baseCost.neutrons.toLocaleString()} нейтронов
                        </p>
                      )}
                      
                      {complex.baseCost.particles && (
                        <p className={`text-xs ${userResources.particles >= complex.baseCost.particles ? 'text-purple-400' : 'text-red-400'}`}>
                          {complex.baseCost.particles.toLocaleString()} частиц
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <button
                    className="px-3 py-2 rounded text-sm bg-blue-600 hover:bg-blue-700"
                    onClick={() => handlePurchaseComplex(complex.type)}
                  >
                    Построить
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
      
      {/* Недоступные комплексы */}
      {availableComplexes && availableComplexes.filter(c => !c.isAvailable).length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3 text-gray-400">
            Будущие комплексы
          </h3>
          
          {availableComplexes
            .filter(complex => !complex.isAvailable)
            .map(complex => (
              <div key={complex.type} className="bg-gray-800 rounded-lg p-4 mb-3 opacity-60">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold">{complex.name}</h4>
                    <p className="text-sm text-gray-400 mt-1">{complex.description}</p>
                    
                    {complex.requirements && (
                      <p className="text-xs text-red-400 mt-2">
                        Требуется: {complex.requirements.complexName} уровня {complex.requirements.requiredLevel}
                      </p>
                    )}
                  </div>
                  <div className="text-gray-500">
                    <span>🔒</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}