"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface SyncManagerProps {
  userId: Id<"users">;
  energons: number;
  neutrons: number;
  particles: number;
}

export default function SyncManager({ userId, energons, neutrons, particles }: SyncManagerProps) {
  const syncResources = useMutation(api.resources.syncResources);
  const isUnmounting = useRef(false);
  
  useEffect(() => {
    // Функция для синхронизации при выходе
    const handleBeforeUnload = () => {
      isUnmounting.current = true;
      
      // Выполняем синхронизацию перед закрытием
      try {
        // Используем синхронный XMLHttpRequest для гарантированной отправки
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/sync-resources", false); // синхронный запрос
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify({
          userId,
          clientTime: Date.now(),
          clientEnergons: energons,
          clientNeutrons: neutrons,
          clientParticles: particles,
          isClosing: true
        }));
      } catch (error) {
        console.error("Ошибка синхронизации при закрытии:", error);
      }
    };
    
    // Установка обработчиков событий
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);
    
    // Периодическая синхронизация каждые 30 секунд
    const syncInterval = setInterval(() => {
      if (!isUnmounting.current) {
        syncResources({
          userId,
          clientTime: Date.now(),
          clientEnergons: energons,
          clientNeutrons: neutrons,
          clientParticles: particles
        }).catch(console.error);
      }
    }, 30000);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      clearInterval(syncInterval);
      
      // Синхронизация при размонтировании компонента
      if (!isUnmounting.current) {
        syncResources({
          userId,
          clientTime: Date.now(),
          clientEnergons: energons,
          clientNeutrons: neutrons,
          clientParticles: particles,
          isClosing: true
        }).catch(console.error);
      }
    };
  }, [userId, energons, neutrons, particles, syncResources]);
  
  // Этот компонент ничего не рендерит
  return null;
} 