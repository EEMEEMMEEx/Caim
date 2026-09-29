import { Suspense } from "react"
import { ProcessClaimPortalLanding } from "@/components/landing/ProcessClaimPortalLanding"

function PortalLandingSkeleton() {
  return (
    <div className="min-h-screen w-full bg-[#070d18] flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="size-12 animate-pulse rounded-xl bg-slate-800" />
        <div className="h-6 w-48 animate-pulse rounded-md bg-slate-800" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-slate-800" />
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<PortalLandingSkeleton />}>
      <ProcessClaimPortalLanding />
    </Suspense>
  )
}
