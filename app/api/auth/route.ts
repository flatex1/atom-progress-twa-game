import { NextResponse } from "next/server";
import crypto from "crypto";

// Функция для проверки данных Telegram WebApp
function validateTelegramWebAppData(initData: string): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN не установлен");
  }

  // Разбираем строку initData на параметры
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  // Удаляем hash из проверяемых данных
  params.delete("hash");
  
  // Сортируем оставшиеся параметры по ключу
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  // Создаем секретный ключ из токена бота
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  
  // Вычисляем HMAC для строки данных
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
  
  // Сравниваем вычисленный хеш с полученным
  return calculatedHash === hash;
}

// API обработчик для проверки данных от Telegram WebApp
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { initData } = body;
    
    if (!initData) {
      return NextResponse.json({ 
        success: false, 
        error: "Отсутствуют данные инициализации" 
      }, { status: 400 });
    }
    
    const isValid = validateTelegramWebAppData(initData);
    
    if (isValid) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: "Недействительные данные инициализации" 
      }, { status: 403 });
    }
  } catch (error) {
    console.error("Ошибка при проверке данных Telegram:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Ошибка при обработке запроса" 
    }, { status: 500 });
  }
}