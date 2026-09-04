import { Fraunces, Karla, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const karla = Karla({ subsets: ["latin"], variable: "--font-karla" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata = {
  title: "Cootravir PH · Comunicaciones",
  description: "Envío de WhatsApp a encargados de unidades residenciales",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${fraunces.variable} ${karla.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
