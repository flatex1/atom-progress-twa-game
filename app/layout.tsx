import "./globals.css";
import { Inter } from "next/font/google";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { TelegramProvider } from "@/components/providers/telegram-provider";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata = {
  title: "Атомный Прогресс",
  description:
    "Научно-экономический симулятор в стиле советской научной эстетики",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: "#2A2F45",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <ConvexClientProvider>
          <TelegramProvider>{children}</TelegramProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
