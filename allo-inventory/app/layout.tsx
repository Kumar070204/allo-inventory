import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Allo Inventory System",
  description: "Concurrency-safe inventory reservation system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (

    <html lang="en">

      <body
        className="
          bg-zinc-950
          text-white
          antialiased
        "
      >

        {children}

      </body>
    </html>
  );
}