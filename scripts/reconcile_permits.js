/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Pure Date Math Functions matching src/lib/utils/permitSla.ts
function parseLocalDate(dateInput) {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return new Date(dateInput);
  const dStr = String(dateInput).slice(0, 10);
  const parts = dStr.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatDateToYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

function differenceInCalendarDays(dateLeft, dateRight) {
  const utcLeft = Date.UTC(dateLeft.getFullYear(), dateLeft.getMonth(), dateLeft.getDate());
  const utcRight = Date.UTC(dateRight.getFullYear(), dateRight.getMonth(), dateRight.getDate());
  return Math.round((utcLeft - utcRight) / (1000 * 60 * 60 * 24));
}

function calculatePermitExpirationDate(issueDateStr, validityDays = 90) {
  const issueDate = parseLocalDate(issueDateStr);
  const expDate = addDays(issueDate, validityDays);
  return formatDateToYMD(expDate);
}

function calculatePermitSla(issueDateStr, expiryDateStr, targetDate = new Date()) {
  const TOTAL_SLA_DAYS = 90;
  const issueDate = parseLocalDate(issueDateStr);
  const calculatedExpiry = addDays(issueDate, TOTAL_SLA_DAYS);
  const expirationDate = expiryDateStr && !isNaN(Date.parse(expiryDateStr))
    ? parseLocalDate(expiryDateStr)
    : calculatedExpiry;
  const currentDate = parseLocalDate(targetDate);

  const elapsedDays = Math.max(0, differenceInCalendarDays(currentDate, issueDate));
  const rawRemaining = differenceInCalendarDays(expirationDate, currentDate);
  const remainingDays = Math.max(0, rawRemaining);

  const isExpired = rawRemaining <= 0;
  const isExpiringSoon = !isExpired && remainingDays <= 15;
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / TOTAL_SLA_DAYS) * 100)));

  let status = 'active';
  if (isExpired) status = 'expired';
  else if (isExpiringSoon) status = 'warning';

  let badgeText = `เหลืออีก ${remainingDays} วัน`;
  if (isExpired) badgeText = 'หมดอายุแล้ว';
  else if (isExpiringSoon) badgeText = `ใกล้หมดอายุ เหลืออีก ${remainingDays} วัน`;

  const subtext = `กรอบเวลา SLA 90 วัน (ผ่านไป ${elapsedDays} วัน)`;

  return {
    totalDays: TOTAL_SLA_DAYS,
    elapsedDays,
    remainingDays,
    isExpired,
    isExpiringSoon,
    progressPercent,
    badgeText,
    subtext,
    status,
    expirationDate: formatDateToYMD(expirationDate),
  };
}

function normalizePermitRecord(p, evaluationDate = new Date()) {
  if (!p) return null;
  const normalizedIssueDate = p.issueDate ? String(p.issueDate).slice(0, 10) : formatDateToYMD(evaluationDate);
  const strictExpiryDate = calculatePermitExpirationDate(normalizedIssueDate, 90);
  const sla = calculatePermitSla(normalizedIssueDate, strictExpiryDate, evaluationDate);

  return {
    ...p,
    issueDate: normalizedIssueDate,
    expiryDate: strictExpiryDate,
    totalDays: sla.totalDays,
    elapsedDays: sla.elapsedDays,
    remainingDays: sla.remainingDays,
    progressPercent: sla.progressPercent,
    status: sla.status,
    badgeText: sla.badgeText,
    subtext: sla.subtext,
    updatedAt: new Date().toISOString(),
  };
}

async function runReconciliation() {
  console.log('=== STARTING 90-DAY PERMIT SLA RECONCILIATION & DATA MIGRATION ===');
  const now = new Date();
  console.log('Current evaluation date:', formatDateToYMD(now));

  // 1. Reconcile MongoDB collections
  const uri = process.env.MONGODB_URI;
  if (uri) {
    console.log('\n[1/3] Connecting to MongoDB...');
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('caim');

    // Audit and update RMA collection
    const rmas = await db.collection('rma').find({}).toArray();
    console.log(`Found ${rmas.length} RMA documents in MongoDB to audit.`);

    for (const rma of rmas) {
      let modified = false;
      let updatedPermitInfo = rma.permitInfo;
      let updatedPermits = rma.permits;

      if (rma.permitInfo) {
        const oldExpiry = rma.permitInfo.expiryDate;
        updatedPermitInfo = normalizePermitRecord(rma.permitInfo, now);
        console.log(`  RMA ${rma.rmaNo} permitInfo (${rma.permitInfo.permitNo}):`);
        console.log(`    issueDate: ${updatedPermitInfo.issueDate}`);
        console.log(`    expiryDate: ${oldExpiry} -> ${updatedPermitInfo.expiryDate}`);
        console.log(`    elapsedDays: ${updatedPermitInfo.elapsedDays}, remainingDays: ${updatedPermitInfo.remainingDays}`);
        modified = true;
      }

      if (Array.isArray(rma.permits) && rma.permits.length > 0) {
        updatedPermits = rma.permits.map((p) => {
          const oldExp = p.expiryDate;
          const norm = normalizePermitRecord(p, now);
          console.log(`  RMA ${rma.rmaNo} permit (${norm.permitNo}):`);
          console.log(`    issueDate: ${norm.issueDate}`);
          console.log(`    expiryDate: ${oldExp} -> ${norm.expiryDate}`);
          console.log(`    elapsedDays: ${norm.elapsedDays}, remainingDays: ${norm.remainingDays}`);
          return norm;
        });
        modified = true;
      }

      if (modified) {
        await db.collection('rma').updateOne(
          { _id: rma._id },
          {
            $set: {
              permitInfo: updatedPermitInfo,
              permits: updatedPermits,
              updatedAt: new Date().toISOString(),
            },
          }
        );
        console.log(`  -> Successfully updated RMA ${rma.rmaNo} in MongoDB.`);
      }
    }

    // Audit and update transaction_logs collection
    const txLogs = await db.collection('transaction_logs').find({}).toArray();
    console.log(`\nAuditing ${txLogs.length} transaction logs in MongoDB...`);
    let txUpdatedCount = 0;

    for (const log of txLogs) {
      if (log.details && log.details.issueDate) {
        const strictExp = calculatePermitExpirationDate(log.details.issueDate, 90);
        const sla = calculatePermitSla(log.details.issueDate, strictExp, now);
        if (log.details.expiryDate !== strictExp || log.details.daysRemaining !== sla.remainingDays) {
          await db.collection('transaction_logs').updateOne(
            { _id: log._id },
            {
              $set: {
                'details.expiryDate': strictExp,
                'details.validityDays': 90,
                'details.remainingDays': sla.remainingDays,
                'details.elapsedDays': sla.elapsedDays,
                'details.status': sla.status,
                reconciledAt: new Date().toISOString(),
              },
            }
          );
          console.log(`  Fixed TX Log ${log.id} (${log.details.permitNo}): expiry ${log.details.expiryDate} -> ${strictExp}`);
          txUpdatedCount++;
        }
      }
    }
    console.log(`-> Reconciled ${txUpdatedCount} transaction logs in MongoDB.`);
    await client.close();
  } else {
    console.log('[1/3] MongoDB URI not configured, skipping Mongo step.');
  }

  // 2. Reconcile local file src/data/rma.json
  console.log('\n[2/3] Auditing and reconciling src/data/rma.json...');
  const jsonPath = path.resolve(__dirname, '../src/data/rma.json');
  if (fs.existsSync(jsonPath)) {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const items = JSON.parse(raw);
    let diskModified = false;

    const reconciledItems = items.map((rma) => {
      let itemUpdated = { ...rma };
      if (itemUpdated.permitInfo) {
        const oldExp = itemUpdated.permitInfo.expiryDate;
        itemUpdated.permitInfo = normalizePermitRecord(itemUpdated.permitInfo, now);
        console.log(`  Disk RMA ${rma.rmaNo} permitInfo (${itemUpdated.permitInfo.permitNo}): ${oldExp} -> ${itemUpdated.permitInfo.expiryDate}`);
        diskModified = true;
      }
      if (Array.isArray(itemUpdated.permits) && itemUpdated.permits.length > 0) {
        itemUpdated.permits = itemUpdated.permits.map((p) => {
          const oldExp = p.expiryDate;
          const norm = normalizePermitRecord(p, now);
          console.log(`  Disk RMA ${rma.rmaNo} permit (${norm.permitNo}): ${oldExp} -> ${norm.expiryDate}`);
          return norm;
        });
        diskModified = true;
      }
      return itemUpdated;
    });

    if (diskModified) {
      fs.writeFileSync(jsonPath, JSON.stringify(reconciledItems, null, 2) + '\n', 'utf8');
      console.log('-> Successfully normalized and saved src/data/rma.json.');
    } else {
      console.log('-> src/data/rma.json already consistent.');
    }
  }

  console.log('\n[3/3] RECONCILIATION SUMMARY:');
  console.log('Strict Math Verification:');
  const check1 = calculatePermitSla('2026-08-27', null, now);
  console.log(`- Case 1 (2026-08-27): Expiry = ${check1.expirationDate}, Elapsed = ${check1.elapsedDays}d, Remaining = ${check1.remainingDays}d, Subtext = "${check1.subtext}", Pill = "${check1.badgeText}"`);
  const check2 = calculatePermitSla('2026-07-21', null, now);
  console.log(`- Case 2 (2026-07-21): Expiry = ${check2.expirationDate}, Elapsed = ${check2.elapsedDays}d, Remaining = ${check2.remainingDays}d, Subtext = "${check2.subtext}", Pill = "${check2.badgeText}"`);

  console.log('\n=== RECONCILIATION COMPLETE ===');
}

runReconciliation().catch((err) => {
  console.error('Reconciliation error:', err);
  process.exit(1);
});
