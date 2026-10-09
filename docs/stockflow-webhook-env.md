# ตั้งค่า Environment Variables ฝั่ง CAIM สำหรับ Stock-Flow Webhook

> ใช้กับโปรเจกต์ **Caim** บน Vercel (repo `EEMEEMMEEx/Caim` / upstream `Slr670/Caim`)
> เป็นขั้นตอนของ **Phase 2** ในแผน CAIM Webhook Integration Plan (`docs/caim-webhook-integration-plan.md` ของ repo Stock-Flow — โฟลเดอร์ `docs` ของ repo นั้นเป็น local-only ไม่ได้ commit ขึ้น git)
>
> เอกสารนี้เก็บไว้ใน repo **Caim** เพื่อให้คนที่ตั้งค่า Vercel ฝั่ง CAIM หาเจอ → สำเนาต้นทางอยู่ที่ `docs/caim-webhook-caim-env-setup.md` ใน repo Stock-Flow (local-only) **แก้ที่ใดให้แก้ทั้งสองที่**

---

## 1. ตัวแปรที่ต้องตั้ง

| ตัวแปร | จำเป็น | ใช้ทำอะไร | ค่า |
|---|---|---|---|
| `CAIM_WEBHOOK_SECRET` | ต้องมี | เซ็น HMAC-SHA256 ของ body เป็น header `x-caim-signature` | shared secret ค่าเดียวกับ Stock-Flow |
| `STOCKFLOW_WEBHOOK_URL` | ไม่บังคับ | override ปลายทางของ webhook | default ในโค้ดคือ `https://stockflowth.online/api/caim-webhook` |

อ่านค่าที่:
- `src/lib/webhooks/stockFlowWebhook.ts:154` → `process.env.CAIM_WEBHOOK_SECRET`
- `src/lib/webhooks/stockFlowWebhook.ts:168` → `process.env.STOCKFLOW_WEBHOOK_URL` (ถ้าไม่ตั้งจะใช้ค่าคงที่บรรทัดที่ 17)
- ฝั่งรับ Stock-Flow: `api/caim-webhook.js:172` → `process.env.CAIM_WEBHOOK_SECRET` (ต้องเป็นค่าเดียวกัน ไม่งั้นตอบ 401)

> `CAIM_WEBHOOK_SECRET` ไม่ได้มาจากที่ไหน — **สร้างเอง** ด้วย CSPRNG แล้วใช้ค่าเดียวกันทั้ง 2 โปรเจกต์

---

## 2. สร้างค่า secret

รันใน PowerShell (เครื่องต้องมี Node.js):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

ต้องได้ hex **64 ตัว** (0-9, a-f) — ถ้าได้สั้นกว่านั้นให้คัดลอกใหม่ทั้งบรรทัด

> ห้ามคัดลอกค่าไปใส่ในไฟล์ใน repo, ห้ามใส่ใน `.env.example`, ห้ามส่งในแชท/ไลน์ — ใส่เฉพาะช่อง Value ของ Vercel

---

## 3. ข้อกำหนดก่อนเริ่ม

1. ฝั่ง Stock-Flow deploy โค้ดที่มี `api/caim-webhook.js` แล้ว (v1.16.0 ขึ้นไป)
2. ฝั่ง Stock-Flow ตั้ง `CAIM_WEBHOOK_SECRET` ด้วยค่าเดียวกันแล้ว และ redeploy แล้ว
3. ตรวจว่า endpoint ตอบถูกต้องก่อนตั้งฝั่ง CAIM:

```powershell
node -e "fetch('https://stockflowth.online/api/caim-webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(async r=>console.log(r.status, await r.text()))"
```

| ผลที่ได้ | ความหมาย |
|---|---|
| `401 invalid webhook signature` | พร้อมใช้งาน (ฟังก์ชันขึ้น + secret ตั้งแล้ว) |
| `500 Missing CAIM_WEBHOOK_SECRET` | โค้ดขึ้นแล้ว แต่ฝั่ง Stock-Flow ยังไม่ตั้ง secret |
| `405` (body ว่าง) | โค้ด v1.16.0 ยังไม่ถูก deploy |

---

## 4. ขั้นตอนตั้งค่าบน Vercel (โปรเจกต์ Caim)

1. เข้า Vercel → เลือกโปรเจกต์ **Caim**
2. ไปที่ **Settings** → **Environment Variables**
3. กด **Add Environment Variable** (หรือ **Create New**)
4. กรอกช่อง **Type**: เลือก **Secret** (ค่าจะถูกซ่อนหลัง Save — ห้ามเลือก Config)
5. กรอกช่อง **Key**: `CAIM_WEBHOOK_SECRET`
6. กรอกช่อง **Value**: วางค่า hex 64 ตัวจากข้อ 2 (ระวังอย่าให้ติดขึ้นบรรทัดใหม่/ช่องว่าง/เครื่องหมายคำพูด)
7. กรอกช่อง **Note (Optional)**: `HMAC secret สำหรับ POST /api/caim-webhook — ต้องตรงกับโปรเจกต์ stock-flow`
8. เลือกช่อง **Environments**: **Production** (ถ้าต้องทดสอบบน Preview ให้เลือก Preview เพิ่ม หรือสร้างตัวแปรซ้ำสำหรับ Preview)
9. กด **Save**
10. **Redeploy** deployment ล่าสุด: แท็บ **Deployments** → deployment ล่าสุด → `⋯` → **Redeploy**
11. (ไม่บังคับ) ถ้าต้อง override ปลายทาง ทำซ้ำข้อ 3-10 ด้วย
    - Key: `STOCKFLOW_WEBHOOK_URL`
    - Type: **Config** ได้ (ไม่ใช่ความลับ)
    - Value: URL เต็ม **ไม่ต้องมี `/` ปิดท้าย** เช่น `https://stockflowth.online/api/caim-webhook`
    - ใช้เมื่อ: ทดสอบกับ staging/preview ของ Stock-Flow หรือ tunnel ในเครื่อง เช่น `https://<random>.trycloudflare.com/api/caim-webhook`

> Environment variable **ไม่มีผลกับ deployment ที่รันอยู่** ต้อง Redeploy ทุกครั้งหลังแก้ค่า

---

## 5. Checklist

| โปรเจกต์ | Key | ค่า | Environment | Redeploy แล้ว |
|---|---|---|---|---|
| stock-flow | `CAIM_WEBHOOK_SECRET` | ค่าเดียวกัน | Production | ☐ |
| Caim | `CAIM_WEBHOOK_SECRET` | ค่าเดียวกัน | Production | ☐ |
| Caim | `STOCKFLOW_WEBHOOK_URL` (ไม่บังคับ) | `https://stockflowth.online/api/caim-webhook` | Production / Preview | ☐ |

---

## 6. ตรวจสอบหลังตั้งค่า

1. ปิดเคสใน CAIM (เปลี่ยนสถานะเป็น **ปิดเคส** แล้วเลือกผลการซ่อม) → ดู log ของ Vercel โปรเจกต์ Caim ต้องเห็น
   `[StockFlow Webhook] delivered <eventId> (HTTP 200)`
2. ตรวจฝั่ง Stock-Flow ว่ามี event เข้ามาจริง — query ตาราง `caim_webhook_logs`:

```sql
SELECT event_id, ticket_id, repair_result, status, message, processed_at
FROM public.caim_webhook_logs
ORDER BY created_at DESC
LIMIT 10;
```

3. ตรวจผลลัพธ์ตาม `repairResult`:
   - `unrepairable` → มีแถวใน `public.scrap_disposal_items` และ **สต็อกไม่ขยับ**
   - `repaired` / `replaced_new` → มีเอกสารรับเข้าใน `stock_in_orders` + `stock_in_items` (+1) และมี `stock_transactions` ประเภท `stock_in` (`reference_type = 'claim_return'`)
4. ตรวจว่า `checkout_return_logs` ของเคสนั้นมี `caim_repair_result`, `caim_inbound_processed_at` และ `caim_stock_in_order_id` หรือ `caim_scrap_disposal_id` ถูกบันทึก

### อาการที่พบบ่อย

| อาการ | สาเหตุ | วิธีแก้ |
|---|---|---|
| CAIM log `skipped: CAIM_WEBHOOK_SECRET is not configured` | ยังไม่ตั้ง env หรือยังไม่ Redeploy | ตั้ง env + Redeploy (ปิดเคสยังสำเร็จปกติ) |
| CAIM log `rejected <eventId> (HTTP 401)` | ค่า secret 2 ฝั่งไม่ตรงกัน หรือมีช่องว่าง/ขึ้นบรรทัดใหม่ตอนวางค่า | เทียบค่าใหม่ทั้ง 2 ฝั่ง + Redeploy ทั้งคู่ |
| CAIM log `rejected <eventId> (HTTP 400)` | timestamp drift เกิน ±300 วินาที (นาฬิกาเครื่อง/server คลาดเคลื่อน) | ตรวจ NTP ของ environment ที่รัน |
| CAIM log `rejected <eventId> (HTTP 422)` | payload ไม่ผ่าน validation (event/repairResult ไม่รองรับ) | อัปเดตโค้ด CAIM ให้ส่งค่าตามสัญญา |
| CAIM log `failed <eventId> after 2 attempts` | เครือข่าย/Stock-Flow ไม่ตอบ | ตรวจว่า Stock-Flow ออนไลน์ แล้วปิดเคสซ้ำ (eventId เดิมจะถูก dedupe) |
| Stock-Flow: `caim_webhook_logs.status = 'unmatched'` | ไม่พบ `checkout_return_logs` ที่มี `caim_ticket_id` ตรงกัน (Ticket ไม่ได้มาจาก Stock-Flow) | ตรวจว่าสร้าง Ticket ผ่าน `/api/sync-to-caim` จาก Stock-Flow |
| Stock-Flow: `status = 'failed'` | RPC ทำงานไม่สำเร็จ ดูคอลัมน์ `message` (เช่น project/item ของ return log หาย) | แก้ข้อมูลต้นทางแล้วส่ง event ซ้ำ |

---

## 7. เปลี่ยนค่า secret (rotation)

1. สร้างค่าใหม่ (ข้อ 2)
2. อัปเดตที่ **stock-flow** และ **Caim** ให้เป็นค่าใหม่ **พร้อมกัน** แล้ว Redeploy ทั้งคู่
3. ช่วงที่ค่ายังไม่ตรงกัน webhook จะถูกปฏิเสธด้วย 401 และ CAIM จะลองซ้ำ 1 ครั้ง — event ที่หลุดสามารถปิดเคสซ้ำได้ เนื่องจาก Stock-Flow ใช้ `eventId` เป็น idempotency key (ไม่เพิ่มสต็อกซ้ำ)

## 8. ยกเลิก/ปิดการยิงชั่วคราว

ลบ `CAIM_WEBHOOK_SECRET` ออกจากโปรเจกต์ Caim แล้ว Redeploy → การปิดเคสยังทำงานครบ แต่จะไม่มีการยิง webhook และมี log `skipped: CAIM_WEBHOOK_SECRET is not configured`

---

## 9. สัญญาการเรียก (อ้างอิง)

| หัวข้อ | ค่า |
|---|---|
| Method / Path | `POST https://stockflowth.online/api/caim-webhook` |
| `x-caim-signature` | `sha256=<hex HMAC-SHA256 ของ raw request body ด้วย CAIM_WEBHOOK_SECRET>` |
| `x-caim-timestamp` | unix epoch วินาที (ต้องต่างจากเวลาฝั่ง Stock-Flow ไม่เกิน ±300 วินาที) |
| `x-caim-event-id` | idempotency key (ฝั่ง Stock-Flow ใช้ค่าจาก payload `eventId` ก่อน) |
| Timeout ฝั่ง CAIM | 8 วินาที, ลองซ้ำ 1 ครั้งเมื่อ 5xx/429/network error |
| โหมดล้มเหลว | ปิดเคสยังสำเร็จเสมอ — การยิงรันผ่าน `after()` หลังตอบ response แล้ว |

ไฟล์ที่เกี่ยวข้อง:
- ฝั่ง CAIM (repo นี้): `src/lib/webhooks/stockFlowWebhook.ts`, `.env.example`
- ฝั่ง Stock-Flow (repo `EEMEEMMEEx/Stock-Flow`): `api/caim-webhook.js`, `supabase/migrations/79_caim_inbound_webhook_processing.sql`, `docs/caim-webhook-caim-env-setup.md` (local-only)