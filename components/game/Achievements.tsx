"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface AchievementsProps {
  userId: Id<"users">;
}

// Определяем тип достижения
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: {
    type: "complex_level" | "resource_amount" | "clicks" | "boosters_used";
    target: number;
    complexType?: string;
    resourceType?: "energons" | "neutrons" | "particles";
  };
  reward: {
    type: "resource";
    resourceType: "energons" | "neutrons" | "particles";
    amount: number;
  };
}

// Список достижений
const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_click",
    name: "Первый атом",
    description: "Нажмите на экран 10 раз",
    icon: "🖱️",
    condition: {
      type: "clicks",
      target: 10
    },
    reward: {
      type: "resource",
      resourceType: "energons",
      amount: 100
    }
  },
  {
    id: "energy_milestone_1",
    name: "Энергетический прорыв",
    description: "Накопите 1,000 энергонов",
    icon: "⚡",
    condition: {
      type: "resource_amount",
      resourceType: "energons",
      target: 1000
    },
    reward: {
      type: "resource",
      resourceType: "neutrons",
      amount: 10
    }
  },
  {
    id: "kollektiv_master",
    name: "Коллективизация",
    description: "Улучшите КОЛЛЕКТИВ-1 до 10 уровня",
    icon: "🏭",
    condition: {
      type: "complex_level",
      complexType: "KOLLEKTIV-1",
      target: 10
    },
    reward: {
      type: "resource",
      resourceType: "energons",
      amount: 1000
    }
  },
  {
    id: "neutron_collector",
    name: "Нейтронный коллектор",
    description: "Накопите 100 нейтронов",
    icon: "⚛️",
    condition: {
      type: "resource_amount",
      resourceType: "neutrons",
      target: 100
    },
    reward: {
      type: "resource",
      resourceType: "energons",
      amount: 2000
    }
  },
  {
    id: "booster_enthusiast",
    name: "Энтузиаст бустеров",
    description: "Используйте 3 разных бустера",
    icon: "🚀",
    condition: {
      type: "boosters_used",
      target: 3
    },
    reward: {
      type: "resource",
      resourceType: "particles",
      amount: 5
    }
  }
];

export default function Achievements({ userId }: AchievementsProps) {
  // Получаем данные пользователя для проверки достижений
  const userData = useQuery(api.users.getUserResources, {
    userId,
  });
  
  // Получаем статистику кликов
  const userStats = useQuery(api.users.getUserStats, {
    userId,
  });
  
  // Получаем комплексы пользователя
  const userComplexes = useQuery(api.complexes.getUserComplexes, {
    userId,
  });
  
  // Получаем историю использования бустеров
  const boosterHistory = useQuery(api.boosters.getBoosterHistory, {
    userId,
    limit: 100
  });
  
  // Если данные еще не загружены
  if (!userData || !userStats || !userComplexes) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-bold mb-2">Достижения</h3>
        <div className="text-center text-gray-400">Загрузка научных достижений...</div>
      </div>
    );
  }
  
  // Проверяем прогресс для каждого достижения
  const achievementsWithProgress = ACHIEVEMENTS.map(achievement => {
    let progress = 0;
    let isCompleted = false;
    
    switch (achievement.condition.type) {
      case "clicks":
        progress = Math.min(100, (userStats.manualClicks / achievement.condition.target) * 100);
        isCompleted = userStats.manualClicks >= achievement.condition.target;
        break;
        
      case "resource_amount":
        if (achievement.condition.resourceType) {
          const resourceAmount = userData[achievement.condition.resourceType];
          progress = Math.min(100, (resourceAmount / achievement.condition.target) * 100);
          isCompleted = resourceAmount >= achievement.condition.target;
        }
        break;
        
      case "complex_level":
        if (achievement.condition.complexType) {
          const complex = userComplexes.find(c => c.type === achievement.condition.complexType);
          if (complex) {
            progress = Math.min(100, (complex.level / achievement.condition.target) * 100);
            isCompleted = complex.level >= achievement.condition.target;
          }
        }
        break;
        
      case "boosters_used":
        if (boosterHistory) {
          // Считаем уникальные типы бустеров
          const uniqueBoosterTypes = new Set(
            boosterHistory.map(history => {
              try {
                const metadata = JSON.parse(history.metadata || "{}");
                return metadata.boosterType;
              } catch {
                return null;
              }
            }).filter(Boolean)
          );
          
          progress = Math.min(100, (uniqueBoosterTypes.size / achievement.condition.target) * 100);
          isCompleted = uniqueBoosterTypes.size >= achievement.condition.target;
        }
        break;
    }
    
    return {
      ...achievement,
      progress,
      isCompleted
    };
  });
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-bold mb-3">Достижения</h3>
      
      <div className="space-y-3">
        {achievementsWithProgress.map(achievement => (
          <div 
            key={achievement.id} 
            className={`flex items-center bg-gray-700 rounded-lg p-3 ${
              achievement.isCompleted ? 'border border-yellow-500' : ''
            }`}
          >
            <div className="text-3xl mr-3">{achievement.icon}</div>
            
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h4 className="font-bold">{achievement.name}</h4>
                <span className={`text-xs ${achievement.isCompleted ? 'text-green-400' : 'text-gray-400'}`}>
                  {achievement.isCompleted ? 'Завершено' : `${Math.floor(achievement.progress)}%`}
                </span>
              </div>
              
              <p className="text-xs text-gray-400 mt-1">{achievement.description}</p>
              
              <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2">
                <div 
                  className={`h-1.5 rounded-full ${
                    achievement.isCompleted ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${achievement.progress}%` }}
                ></div>
              </div>
              
              <div className="text-xs text-gray-400 mt-1">
                Награда: <span className="text-yellow-400">{achievement.reward.amount} {
                  achievement.reward.resourceType === "energons" ? "энергонов" : 
                  achievement.reward.resourceType === "neutrons" ? "нейтронов" : "частиц"
                }</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}