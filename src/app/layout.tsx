import type { Metadata, Viewport } from "next"
import { IBM_Plex_Sans, Sarabun } from "next/font/google"
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
  title: "เข้าสู่ระบบ · ระบบบริหารงานเคลมอุปกรณ์",
  description:
    "ติดตามงานเคลมอุปกรณ์โครงข่ายวิทยุสื่อสาร พร้อมแดชบอร์ดสรุปและรายงานรายสัปดาห์",
  icons: {
    icon: "/favicon.ico",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var stored = localStorage.getItem('theme');
                var isDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            })();`,
          }}
        />
      </head>
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  )
}
