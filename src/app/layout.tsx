import type { Metadata, Viewport } from "next"
import { IBM_Plex_Sans, Sarabun } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { LocaleProvider } from "@/i18n/LocaleContext"
import "./globals.css"

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
})

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
})

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  title: "Process Claim · ระบบบริหารงานเคลมอุปกรณ์",
  description:
    "ติดตามงานเคลมอุปกรณ์โครงข่ายวิทยุสื่อสาร พร้อมแดชบอร์ดสรุปและรายงานรายสัปดาห์",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/icon.svg?v=2", type: "image/svg+xml" },
      { url: "/favicon-32x32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png?v=2", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico?v=2"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="th"
      className={`${ibmPlexSans.variable} ${sarabun.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link rel="icon" href="/icon.svg?v=2" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32x32.png?v=2" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png?v=2" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" sizes="180x180" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var storedTheme = localStorage.getItem('theme');
                var isDark = storedTheme ? storedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                var storedLocale = localStorage.getItem('locale');
                if (storedLocale === 'en' || storedLocale === 'th') {
                  document.documentElement.lang = storedLocale;
                }
              } catch (_) {}
            })();`,
          }}
        />
      </head>
      <body className="min-h-full font-sans antialiased">
        <LocaleProvider>
          <ThemeProvider defaultTheme="system" storageKey="theme">
            {children}
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}
