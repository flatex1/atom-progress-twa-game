import "./globals.css";
import localFont from 'next/font/local'
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { TelegramProvider } from "@/components/providers/telegram-provider";

export const metadata = {
  title: "Атомный Прогресс",
  description:
    "Научно-экономический симулятор в стиле советской научной эстетики",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: "#2A2F45",
};

const blenderPro = localFont({
  src: [
    {
      path: '../public/fonts/BlenderPro-Bold.woff',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/BlenderPro-Medium.woff',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/BlenderPro-Book.woff',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/BlenderPro-Thin.woff',
      weight: '300',
      style: 'normal',
    }
  ],
  display: 'swap',
  variable: '--font-blender-pro',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={blenderPro.className}>
        <ConvexClientProvider>
          <TelegramProvider>{children}</TelegramProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
