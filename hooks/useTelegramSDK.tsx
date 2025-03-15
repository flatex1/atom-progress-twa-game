import { useEffect, useState } from "react";
import { 
  init as initSDK, 
  backButton,
  mainButton,
  initData,
  type User
} from "@telegram-apps/sdk-react";

// Глобальные флаги для отслеживания состояния SDK
let isSDKInitialized = false;

export function useTelegramSDK() {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);
  const [isTMA, setIsTMA] = useState(false);
  
  useEffect(() => {
    // Инициализируем SDK только один раз
    if (!isSDKInitialized) {
      console.log("Инициализация Telegram SDK...");
      try {
        // Просто инициализируем без монтирования компонентов
        initSDK();
        isSDKInitialized = true;
      } catch (e) {
        console.warn("Ошибка инициализации SDK:", e);
      }
    }
    
    // Отложенное получение данных пользователя
    const userDataTimer = setTimeout(() => {
      try {
        // Восстановление данных initData
        if (initData) {
          try {
            initData.restore();
          } catch (e) {
            console.warn("Не удалось восстановить initData:", e);
          }
        }
        
        const userData = initData?.user?.valueOf();
        if (userData) {
          console.log("Данные пользователя получены:", userData);
          setUser(userData as User);
          
          // Определяем платформу
          const hash = window.location.hash.slice(1);
          const params = new URLSearchParams(hash);
          const platform = params.get('tgWebAppPlatform') || 'unknown';
          
          setIsTelegram(platform !== 'unknown');
          setIsTMA(platform !== 'unknown');
          setIsReady(true);
        }
      } catch (e) {
        console.error("Ошибка получения данных пользователя:", e);
      }
    }, 300); // Задержка для стабилизации SDK
    
    return () => {
      clearTimeout(userDataTimer);
    };
  }, []);
  
  return {
    user,
    isReady,
    isTelegram,
    isTMA,
    mainButton,
    backButton
  };
} 