"use client";

import { ReactNode, createContext, useContext, useEffect, useState } from "react";

// Типы для Telegram WebApp
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          enable: () => void;
          disable: () => void;
        };
      };
    };
  }
}

type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

type TelegramContextType = {
  user: TelegramUser | null;
  isReady: boolean;
  tg: typeof window.Telegram.WebApp | null;
  showMainButton: (text: string, callback: () => void) => void;
  hideMainButton: () => void;
};

const TelegramContext = createContext<TelegramContextType>({
  user: null,
  isReady: false,
  tg: null,
  showMainButton: () => {},
  hideMainButton: () => {},
});

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [tg, setTg] = useState<typeof window.Telegram.WebApp | null>(null);

  useEffect(() => {
    // Проверяем, запущены ли мы в Telegram WebApp
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      
      // Устанавливаем пользователя из данных WebApp
      if (webApp.initDataUnsafe?.user) {
        setUser(webApp.initDataUnsafe.user);
      }
      
      setTg(webApp);
      webApp.ready();
      webApp.expand();
      setIsReady(true);
    }
  }, []);

  // Функция для управления главной кнопкой
  const showMainButton = (text: string, callback: () => void) => {
    if (!tg) return;
    
    tg.MainButton.setText(text);
    tg.MainButton.onClick(callback);
    tg.MainButton.show();
  };

  const hideMainButton = () => {
    if (!tg) return;
    tg.MainButton.hide();
  };

  return (
    <TelegramContext.Provider value={{ user, isReady, tg, showMainButton, hideMainButton }}>
      {children}
    </TelegramContext.Provider>
  );
}

// Хук для использования Telegram контекста
export const useTelegram = () => useContext(TelegramContext);