import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import { cn } from "@devmentor/ui/lib/utils";

import "@devmentor/ui/globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "DevMentor",
    template: "%s | DevMentor",
  },
  description: "DevMentor helps developers grow with guided mentorship.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans antialiased", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
