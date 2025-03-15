import { Suspense } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Компонент загрузки для Suspense
function LoadingLeaderboard() {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Загрузка рейтинга...</h1>
      <div className="bg-gray-800 rounded-lg shadow-md p-4">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-10 w-10 rounded-full bg-gray-700"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="h-6 bg-gray-700 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Асинхронный компонент для загрузки данных
async function LeaderboardContent() {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  
  // Получаем топ-50 игроков
  const topPlayers = await convex.query(api.leaderboard.getTopPlayers, {
    limit: 50,
    sortBy: "energons"
  });
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Рейтинг учёных</h1>
      
      <div className="mb-4 text-center text-sm text-gray-400">
        Обновлено: {new Date().toLocaleString("ru-RU")}
      </div>
      
      <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Место
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Учёный
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Энергоны
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Производство
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {topPlayers.map((player, index) => (
              <tr key={player._id} className={`${index < 3 ? "bg-gray-750" : ""}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`
                    text-center font-bold rounded-full w-8 h-8 flex items-center justify-center
                    ${index === 0 ? "bg-yellow-500 text-white" : 
                      index === 1 ? "bg-gray-400 text-white" : 
                      index === 2 ? "bg-amber-700 text-white" : 
                      "bg-gray-700 text-gray-300"}
                  `}>
                    {index + 1}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center">
                      {player.firstName?.charAt(0) || "?"}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-white">
                        {player.firstName || "Учёный"}
                      </div>
                      {player.username && (
                        <div className="text-sm text-gray-400">
                          @{player.username}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="text-yellow-400 font-bold">
                    {player.energons.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="text-green-400 font-bold">
                    {player.totalProduction.toLocaleString()}/сек
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  return (
    <Suspense fallback={<LoadingLeaderboard />}>
      <LeaderboardContent />
    </Suspense>
  );
}

// Настройка ISR с ревалидацией каждые 30 минут
export const revalidate = 1800;