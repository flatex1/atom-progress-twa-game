"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TestPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Перенаправляем на игровую страницу с параметром эмуляции
    router.push('/game?emulate=true');
  }, [router]);
  
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <p>Перенаправление на тестовую версию игры...</p>
    </div>
  );
}