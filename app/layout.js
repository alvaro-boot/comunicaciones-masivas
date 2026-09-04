import { Syne, Outfit, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata = {
  title: "Prisma Reach",
  description: "Comunicaciones de Prisma Dev. Mensajes que llegan.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${syne.variable} ${outfit.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
