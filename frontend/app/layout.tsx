import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { UserProfileProvider } from "@/context/UserProfileContext";
import Navbar from "@/components/Navbar";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Futuro — Your Benefits & Pension Platform",
  description: "AI-powered health insurance and pension planning for employees",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-50 antialiased`}>
        <UserProfileProvider>
          <Navbar />
          <main>{children}</main>
        </UserProfileProvider>
      </body>
    </html>
  );
}
