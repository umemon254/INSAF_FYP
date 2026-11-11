import type { Metadata } from "next";
import "./globals.css";
import ThemeLoader from "./ThemeLoader";

export const metadata: Metadata = {
  title: "INSAF",
  description: "Legal information and lawyer directory",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeLoader />
        {children}
      </body>
    </html>
  );
}
