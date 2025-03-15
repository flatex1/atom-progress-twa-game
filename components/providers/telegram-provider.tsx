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
    TelegramGameProxy?: {
      receiveEvent: (eventType: string, eventData: unknown) => void;
    };
    TelegramWebView?: {
      receiveEvent: (eventType: string, eventData: unknown) => void;
    };
    TelegramGameProxy_receiveEvent?: (eventType: string, eventData: unknown) => void;
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
    console.log("Инициализация Telegram WebApp...");
    console.log("Telegram API доступен:", typeof window !== "undefined" && !!window.Telegram);
    
    // Проверяем наличие параметра эмуляции в URL
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const useEmulation = urlParams.get('emulate') === 'true';
    
    // Если мы не в Telegram или включен режим эмуляции
    if ((typeof window !== "undefined" && !window.Telegram?.WebApp) || useEmulation) {
      console.log("Создаем эмуляцию Telegram WebApp");
      
      window.Telegram = {
        WebApp: {
          initData: "mock_init_data",
          initDataUnsafe: {
            user: {
              id: 123456789,
              first_name: "Тестовый",
              last_name: "Пользователь",
              username: "test_user"
            }
          },
          ready: function() { console.log("Эмуляция: Telegram WebApp готов"); },
          expand: function() { console.log("Эмуляция: Telegram WebApp развернут"); },
          close: function() { console.log("Эмуляция: Telegram WebApp закрыт"); },
          MainButton: {
            show: function() { console.log("Эмуляция: Показана главная кнопка"); },
            hide: function() { console.log("Эмуляция: Скрыта главная кнопка"); },
            setText: function(text) { console.log("Эмуляция: Текст кнопки:", text); },
            onClick: function(callback) { 
              console.log("Эмуляция: Добавлен обработчик клика");
              document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') callback();
              });
            },
            offClick: function() { console.log("Эмуляция: Удален обработчик клика"); },
            enable: function() {},
            disable: function() {}
          }
        }
      };
      
      // Устанавливаем мок пользователя
      setUser({
        id: 123456789,
        first_name: "Тестовый",
        last_name: "Пользователь",
        username: "test_user"
      });
      
      // Устанавливаем мок WebApp
      setTg(window.Telegram.WebApp);
      setIsReady(true);
      
      console.log("Эмуляция Telegram WebApp инициализирована");
    }
    
    // Проверяем, запущены ли мы в Telegram WebApp
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      
      // Логирование данных WebApp
      console.log("Telegram WebApp инициализирован!");
      console.log("initData:", webApp.initData);
      console.log("initDataUnsafe:", JSON.stringify(webApp.initDataUnsafe, null, 2));
      console.log("Данные пользователя:", webApp.initDataUnsafe?.user);
      
      // Устанавливаем пользователя из данных WebApp
      if (webApp.initDataUnsafe?.user) {
        setUser(webApp.initDataUnsafe.user);
        console.log("Пользователь установлен:", webApp.initDataUnsafe.user);
      } else {
        console.warn("Данные пользователя отсутствуют в initDataUnsafe, используем мок");
        // В боевом режиме используем тестового пользователя если не получили данные
        setUser({
          id: 777777777, 
          first_name: "Гость",
          username: "guest"
        });
      }
      
      // Инициализация WebApp
      try {
        setTg(webApp);
        webApp.ready();
        webApp.expand();
        setIsReady(true);
        console.log("Telegram WebApp готов (webApp.ready() вызван)");
      } catch (error) {
        console.error("Ошибка при инициализации Telegram WebApp:", error);
      }
    } else {
      console.warn("Telegram WebApp не доступен. Возможно, приложение запущено вне Telegram или используется режим разработки.");
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