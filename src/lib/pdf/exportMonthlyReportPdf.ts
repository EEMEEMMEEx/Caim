"use client"

import * as React from "react"
import type { CaimMonthlyReportData } from "./types"

/**
 * Client-side dynamic exporter for the 4-Page CAIM Monthly Report PDF.
 * Uses dynamic imports for @react-pdf/renderer to prevent SSR bundle bloat
 * and avoid runtime errors like 'Buffer is not defined'.
 * Ensures Thai fonts are fully decoded and registered prior to rendering.
 */
export async function exportMonthlyReportPdf(data: CaimMonthlyReportData): Promise<void> {
  if (typeof window === "undefined") return

  try {
    // 1. Dynamic import of React-PDF client engine and document component
    const [{ pdf }, { CaimMonthlyReportPDF, registerPdfFonts }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("./CaimMonthlyReportPDF"),
    ])

    // 2. Ensure Thai fonts are registered with valid TTF binaries via base64 loader
    await registerPdfFonts()

    // 3. Generate PDF Blob
    const element = React.createElement(CaimMonthlyReportPDF, { data })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = await pdf(element as any).toBlob()

    // 4. Trigger immediate file download
    const url = URL.createObjectURL(blob)
    const downloadAnchor = document.createElement("a")
    const sanitizedNumber = data.reportNumber.replace(/[^a-zA-Z0-9_-]/g, "_")
    downloadAnchor.href = url
    downloadAnchor.download = `${sanitizedNumber}.pdf`
    downloadAnchor.style.display = "none"
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()

    // 5. Clean up DOM and revoke object URL to prevent memory leaks
    document.body.removeChild(downloadAnchor)
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 3000)
  } catch (error) {
    console.error("[CAIM Monthly Report PDF] Export failed:", error)
    throw error
  }
}
