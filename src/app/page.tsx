import { Suspense } from "react"
import Image from "next/image"
import { LoginForm } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/LoginForm"

function LoginSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <div
          data-slot="skeleton"
          className="size-14 animate-pulse rounded-2xl bg-muted"
        />
        <div
          data-slot="skeleton"
          className="h-7 w-44 animate-pulse rounded-md bg-muted mt-2"
        />
        <div
          data-slot="skeleton"
          className="h-4 w-60 animate-pulse rounded-md bg-muted"
        />
      </div>
      <div
        data-slot="skeleton"
        className="h-24 w-full animate-pulse rounded-xl bg-muted"
      />
      <div
        data-slot="skeleton"
        className="h-11 w-full animate-pulse rounded-xl bg-muted"
      />
    </div>
  )
}

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[118%]">
        <Image
          src="/images/IMG_8154_enhanced_2x.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={80}
          className="object-cover object-bottom"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,26,79,0.74)_0%,rgba(0,26,79,0.68)_34%,rgba(0,26,79,0.56)_60%,rgba(0,26,79,0.1)_79%,rgba(0,26,79,0.02)_100%)]"
      />
      <div className="animate-in fade-in slide-in-from-bottom-2 relative w-full max-w-104 duration-500">
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl p-7 shadow-2xl shadow-slate-950/20 sm:p-8">
          <Suspense fallback={<LoginSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
