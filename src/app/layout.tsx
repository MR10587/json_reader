import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ChatArchiveProvider } from "@/components/ChatArchiveProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChatArchive",
  description: "Private, in-browser viewer for your ChatGPT data export.",
};

const themeScript = `(function(){try{var key="chatarchive-theme";var stored=localStorage.getItem(key);var theme=stored==="light"||stored==="dark"?stored:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",theme)}catch(error){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <ChatArchiveProvider>{children}</ChatArchiveProvider>
      </body>
    </html>
  );
}
