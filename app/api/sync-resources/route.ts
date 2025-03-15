import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { userId, clientTime, clientEnergons, clientNeutrons, clientParticles, isClosing } = body;
    
    // Вызываем мутацию Convex через HTTP клиент
    await client.mutation(api.resources.syncResources, {
      userId,
      clientTime,
      clientEnergons,
      clientNeutrons,
      clientParticles,
      isClosing
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка синхронизации ресурсов:", error);
    return NextResponse.json({ success: false, error: "Ошибка синхронизации" }, { status: 500 });
  }
} 