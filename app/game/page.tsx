"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTelegram } from "@/components/providers/telegram-provider";

// Компоненты
import ResourceCounter from "@/components/game/ResourceCounter";
import ActiveBoosters from "@/components/game/ActiveBoosters";
import BoosterCard from "@/components/game/BoosterCard";
import ComplexList from "@/components/game/ComplexList";
import SyncManager from "@/components/game/SyncManager";

export default function GamePage() {
  const { user, isReady } = useTelegram();
  const [activeTab, setActiveTab] = useState<"complexes" | "boosters">(
    "complexes"
  );
  const [isLoading, setIsLoading] = useState(true);

  // Получаем пользователя по telegramId
  const getUserByTelegram = useQuery(
    api.users.getUserByTelegramId,
    isReady && user?.id ? { telegramId: user.id } : "skip"
  );

  // Создаем пользователя, если не существует
  const createUserIfNeeded = useMutation(api.users.createUser);

  // Получаем доступные бустеры
  const availableBoosters = useQuery(
    api.boosters.getAvailableBoosters,
    getUserByTelegram?._id ? { userId: getUserByTelegram._id } : "skip"
  );

  // Эффект для создания пользователя при первом входе
  useEffect(() => {
    const initializeUser = async () => {
      if (!isReady) {
        console.log("Ожидаем инициализации Telegram WebApp...");
        return;
      }

      if (!user) {
        console.error("Пользователь не определен после инициализации WebApp");
        return;
      }

      console.log("Проверка существования пользователя:", user.id);

      if (getUserByTelegram === undefined) {
        console.log("Запрос пользователя выполняется...");
        return;
      }

      if (getUserByTelegram === null) {
        try {
          console.log("Создаем нового пользователя для:", user);

          const newUser = await createUserIfNeeded({
            telegramId: user.id,
            username: user.username || "",
            firstName: user.first_name || "",
            lastName: user.last_name || "",
          });

          console.log("Пользователь создан:", newUser);
        } catch (error) {
          console.error("Ошибка при создании пользователя:", error);
        }
      } else {
        console.log("Пользователь уже существует:", getUserByTelegram);
      }

      setIsLoading(false);
    };

    initializeUser();
  }, [isReady, user, getUserByTelegram, createUserIfNeeded]);

  // Если данные еще загружаются, показываем детальный индикатор загрузки
  if (isLoading || !isReady || !user || !getUserByTelegram) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-pulse mb-4">⚛️</div>
          <div>Загружаем комплексы...</div>
          <div className="text-xs text-gray-500 mt-2">
            Статус:{" "}
            {!isReady
              ? "Инициализация Telegram"
              : !user
                ? "Ожидание данных пользователя"
                : !getUserByTelegram
                  ? "Получение игрового профиля"
                  : "Загрузка завершается"}
          </div>
        </div>
      </div>
    );
  }

  // Извлекаем ресурсы пользователя для передачи в компоненты
  const userResources = {
    energons: getUserByTelegram.energons,
    neutrons: getUserByTelegram.neutrons,
    particles: getUserByTelegram.particles,
  };

  return (
    <main className="container mx-auto px-4 py-6 max-w-md">
      <SyncManager
        userId={getUserByTelegram._id}
        energons={userResources.energons}
        neutrons={userResources.neutrons}
        particles={userResources.particles}
      />

      <h1 className="text-2xl font-bold text-center mb-6">Ваш кабинет</h1>

      {/* Счетчик ресурсов */}
      <ResourceCounter userId={getUserByTelegram._id} />

      {/* Активные бустеры */}
      <ActiveBoosters userId={getUserByTelegram._id} />

      {/* Табы переключения между комплексами и бустерами */}
      <div className="flex bg-gray-800 rounded-lg mb-4">
        <button
          className={`flex-1 py-3 text-center text-white rounded-lg ${
            activeTab === "complexes" ? "bg-gray-700" : ""
          }`}
          onClick={() => setActiveTab("complexes")}
        >
          Комплексы
        </button>
        <button
          className={`flex-1 py-3 text-center text-white rounded-lg ${
            activeTab === "boosters" ? "bg-gray-700" : ""
          }`}
          onClick={() => setActiveTab("boosters")}
        >
          Разработки
        </button>
      </div>

      {/* Основной контент в зависимости от выбранного таба */}
      {activeTab === "complexes" && (
        <ComplexList
          userId={getUserByTelegram._id}
          userResources={userResources}
        />
      )}

      {activeTab === "boosters" && availableBoosters && (
        <div>
          <h2 className="text-xl text-white font-bold mb-4">Доступные разработки</h2>

          {availableBoosters.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-gray-400">
                У вас пока нет доступных научных разработок. Разблокируйте
                комплексы, чтобы получить доступ к ним.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableBoosters.map((booster) => (
                <BoosterCard
                  key={booster.type}
                  booster={booster}
                  userId={getUserByTelegram._id}
                  userResources={userResources}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Информация о пользователе */}
      <div className="mt-8 bg-gray-800 rounded-lg p-4">
        <div className="text-center text-sm text-gray-400">
          <p>
            Telegram:{" "}
            {user?.username
              ? `@${user.username}`
              : `${user?.first_name || "Игрок"}`}
          </p>
          <p className="mt-1">ID: {getUserByTelegram._id.slice(0, 8)}...</p>
          <p className="mt-1">
            Дата регистрации:{" "}
            {new Date(getUserByTelegram.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </main>
  );
}
