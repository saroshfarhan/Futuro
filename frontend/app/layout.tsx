import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import "./globals.css";
import { UserProfileProvider } from "@/context/UserProfileContext";
import Navbar from "@/components/Navbar";

const geist = Geist({ subsets: ["latin"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Futuro — Your Benefits & Pension Platform",
  description: "AI-powered health insurance and pension planning for employees",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${inter.variable} font-sans antialiased text-foreground bg-kota-dark`}>
        <UserProfileProvider>
          <Navbar />
          <main>{children}</main>
        </UserProfileProvider>
      </body>
    </html>
  );
}
