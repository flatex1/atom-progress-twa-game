"use client";

import { ReactNode, createContext, useContext } from "react";
import { backButton, mainButton } from "@telegram-apps/sdk-react";
import { useTelegramSDK } from "@/hooks/useTelegramSDK";

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
  const sdk = useTelegramSDK();
  
  // Преобразуем User в TelegramUser
  const telegramUser: TelegramUser | null = sdk.user ? {
    id: sdk.user.id,
    first_name: sdk.user.first_name,
    last_name: sdk.user.last_name,
    username: sdk.user.username
  } : null;
  
  return (
    <TelegramContext.Provider value={{ 
      user: telegramUser, 
      isReady: sdk.isReady, 
      mainButton: mainButton, 
      backButton: backButton,
      platform: {
        isTelegram: sdk.isTelegram,
        isTMA: sdk.isTMA
      }
    }}>
      {children}
    </TelegramContext.Provider>
  );
}