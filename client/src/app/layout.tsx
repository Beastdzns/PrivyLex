import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { headers } from "next/headers"; 
import ContextProvider from '@/context'

export const metadata: Metadata = {
  title: "PrivyLex",
  description: "Powered by IExec"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const hdrs = await headers();
  const cookies = hdrs.get('cookie');

  return (
    <html lang="en">
      <body>
        <ContextProvider cookies={cookies}>{children}</ContextProvider>
      </body>
    </html>
  )
}
