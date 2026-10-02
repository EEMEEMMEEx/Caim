import { z } from "zod"

/**
 * Zod validation schema for the 'แจ้งเคลม' (New Claim Registration) form.
 * Encapsulates ticket fields and the 'ผู้เกี่ยวข้อง' (Stakeholders & Personnel) section.
 */
export const claimFormSchema = z.object({
  ticketTitle: z
    .string()
    .trim()
    .min(1, "กรุณาระบุเลขที่เคลม"),
  selectedSerial: z
    .string()
    .trim()
    .min(1, "กรุณาเลือกอุปกรณ์ที่ต้องการแจ้งเคลม"),
  receivedDate: z
    .string()
    .min(1, "กรุณาระบุวันและเวลาที่รับแจ้ง"),
  warranty: z
    .string()
    .default("warranty"),
  problemDesc: z
    .string()
    .trim()
    .min(1, "กรุณาระบุอาการเสียหรือปัญหาที่พบอย่างละเอียด"),
  serviceCenter: z
    .string()
    .default("Huawei"),
  dueDate: z
    .string()
    .optional(),
  selectedProvince: z
    .string()
    .optional(),
  selectedDistrict: z
    .string()
    .optional(),
  selectedStationId: z
    .string()
    .optional(),

  // ผู้เกี่ยวข้อง (Stakeholders & Personnel)
  reporterName: z
    .string()
    .trim()
    .max(120, "ชื่อผู้แจ้งหรือเจ้าของเครื่องต้องไม่เกิน 120 ตัวอักษร")
    .optional()
    .default(""),
  assigneeName: z
    .string()
    .trim()
    .max(120, "ชื่อผู้รับผิดชอบเคสต้องไม่เกิน 120 ตัวอักษร")
    .optional()
    .default(""),
  remarks: z
    .string()
    .trim()
    .max(1000, "หมายเหตุต้องไม่เกิน 1,000 ตัวอักษร")
    .optional()
    .default(""),
})

export type ClaimFormData = z.infer<typeof claimFormSchema>

/**
 * Validation schema for the claim creation payload dispatched to POST /api/claims or POST /api/tickets
 */
export const claimPayloadSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Missing required ticket title"),
  problemDesc: z.string().default(""),
  vendor: z.string().default("Other"),
  model: z.string().default("-"),
  serialNo: z.string().default("-"),
  status: z.string().default("รับแจ้ง"),
  statusCode: z.number().default(1),
  date: z.string().optional(),
  deadlineDate: z.string().optional(),
  ageDays: z.string().optional(),
  isOverdue: z.boolean().optional(),
  overdueText: z.string().optional(),
  stationId: z.string().optional(),
  station: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  subdistrict: z.string().optional(),

  // Stakeholders & Personnel fields
  reporterName: z.string().optional(),
  assigneeName: z.string().optional(),
  reporter: z.string().optional(),
  assignee: z.string().optional(),
  remarks: z.string().optional(),
})

export type ClaimPayload = z.infer<typeof claimPayloadSchema>
