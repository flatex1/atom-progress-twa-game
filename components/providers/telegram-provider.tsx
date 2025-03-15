"use client";

import { ReactNode, useEffect, useState, createContext, useContext } from "react";
import { 
  init as initSDK, 
  backButton,
  mainButton,
  viewport,
  themeParams,
  miniApp,
  initData,
  type User
} from "@telegram-apps/sdk-react";

type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

type TelegramContext = {
  user: TelegramUser | null;
  isReady: boolean;
  mainButton: typeof mainButton;
  backButton: typeof backButton;
  platform: {
    isTelegram: boolean;
    isTMA: boolean;
  };
};

const TelegramContext = createContext<TelegramContext>({
  user: null,
  isReady: false,
  mainButton: mainButton,
  backButton: backButton,
  platform: {
    isTelegram: false,
    isTMA: false
  }
});

export function useTelegram() {
  return useContext(TelegramContext);
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);
  const [isTMA, setIsTMA] = useState(false);
  
  // Инициализация SDK
  useEffect(() => {
    console.log("Инициализация Telegram SDK...");
    
    async function initializeTelegram() {
      try {
        // Инициализация SDK
        initSDK();
        
        // Монтирование компонентов
        if (backButton.isSupported()) {
          backButton.mount();
        }
        miniApp.mount();
        themeParams.mount();
        initData.restore();
        
        // Монтирование viewport и привязка CSS-переменных
        await viewport.mount().then(() => {
          viewport.bindCssVars();
        }).catch(e => {
          console.error('Ошибка при монтировании viewport', e);
        });
        
        // Привязка CSS-переменных для компонентов
        miniApp.bindCssVars();
        themeParams.bindCssVars();
        
        // Получаем данные инициализации
        const userValue = initData.user;
        if (userValue) {
          const userData = userValue.valueOf() as User;
          console.log("Данные пользователя получены:", userData);
          
          setUser({
            id: userData.id,
            first_name: userData.first_name,
            last_name: userData.last_name,
            username: userData.username
          });
          
          // Получение информации о платформе из URL
          const hash = window.location.hash.slice(1);
          const params = new URLSearchParams(hash);
          const platform = params.get('tgWebAppPlatform') || 'unknown';
          
          const isTelegram = platform !== 'unknown';
          const isInTMA = isTelegram && platform !== 'unknown';
          
          setIsTelegram(isTelegram);
          setIsTMA(isInTMA);
          
          setIsReady(true);
          console.log("Telegram SDK инициализирован успешно");
        } else {
          console.log("Пользовательские данные отсутствуют");
        }
      } catch (error) {
        console.error("Ошибка при инициализации Telegram SDK:", error);
      }
    }
    
    initializeTelegram();
    
    // Компонент для дебага в мобильных устройствах
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const debugElement = document.createElement('div');
      debugElement.style.position = 'fixed';
      debugElement.style.bottom = '0';
      debugElement.style.left = '0';
      debugElement.style.right = '0';
      debugElement.style.background = 'rgba(0,0,0,0.8)';
      debugElement.style.color = 'white';
      debugElement.style.padding = '10px';
      debugElement.style.fontSize = '12px';
      debugElement.style.maxHeight = '30vh';
      debugElement.style.overflow = 'auto';
      debugElement.style.zIndex = '9999';
      document.body.appendChild(debugElement);

      const originalLog = console.log;
      console.log = (...args) => {
        originalLog(...args);
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        
        const logEntry = document.createElement('div');
        logEntry.innerText = `${new Date().toISOString().slice(11, 19)}: ${message}`;
        debugElement.appendChild(logEntry);
        debugElement.scrollTop = debugElement.scrollHeight;
      };
    }
  }, []);
  
  return (
    <TelegramContext.Provider value={{ 
      user, 
      isReady, 
      mainButton: mainButton, 
      backButton: backButton,
      platform: {
        isTelegram,
        isTMA
      }
    }}>
      {children}
    </TelegramContext.Provider>
  );
}