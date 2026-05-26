import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SwapSync | Hostel Room Swaps",
  description: "Find your perfect hostel room swap instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
