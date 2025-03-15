"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "@/components/providers/telegram-provider";

export default function AuthVerifier() {
  const { tg } = useTelegram();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  
  useEffect(() => {
    if (!tg || !tg.initData) {
      setError("Приложение должно быть запущено внутри Telegram");
      setIsVerifying(false);
      return;
    }
    
    // Отправляем данные на сервер для проверки
    fetch("/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initData: tg.initData
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          setError(data.error || "Не удалось проверить подлинность");
        }
        setIsVerifying(false);
      })
      .catch((err) => {
        console.error("Ошибка проверки аутентификации:", err);
        setError("Ошибка при проверке подлинности");
        setIsVerifying(false);
      });
  }, [tg]);

  if (isVerifying) {
    return <div>Проверка подлинности...</div>;
  }

  if (error) {
    return (
      <div className="p-4 max-w-md mx-auto text-center">
        <div className="bg-red-600 text-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-2">Ошибка аутентификации</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return <div>Инициализация игры...</div>;
}