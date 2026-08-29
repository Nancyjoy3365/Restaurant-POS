import type { CommissionType, PayType, StaffMember, StaffRole } from "./types";

export const STAFF_CSV_HEADER =
  "Name,Role,Pay Type,Rate,Commission Type,Commission Value";

export const STAFF_CSV_TEMPLATE = [
  STAFF_CSV_HEADER,
  "Amina Otieno,Waiter,daily,800,,",
  "Brian Kiptoo,Bar Staff,commission,0,percent_of_sales,10",
  "Cynthia Wanjiru,Chef,monthly,35000,,",
].join("\n");

const ROLE_ALIASES: Record<string, StaffRole> = {
  waiter: "Waiter",
  "bar staff": "Bar Staff",
  barstaff: "Bar Staff",
  "bar-staff": "Bar Staff",
  manager: "Manager",
  chef: "Chef",
  cashier: "Cashier",
};

const PAY_TYPE_ALIASES: Record<string, PayType> = {
  daily: "daily",
  monthly: "monthly",
  commission: "commission",
};

const COMMISSION_TYPE_ALIASES: Record<string, CommissionType> = {
  percent_of_sales: "percent_of_sales",
  "percent of sales": "percent_of_sales",
  flat_per_order: "flat_per_order",
  "flat per order": "flat_per_order",
};

export type StaffImportRow = Omit<StaffMember, "id">;

export interface StaffImportError {
  line: number;
  message: string;
}

export interface StaffImportResult {
  valid: StaffImportRow[];
  errors: StaffImportError[];
}

function splitCsvLine(line: string): string[] {
  return line
    .split(",")
    .map((cell) => cell.trim().replace(/^"(.*)"$/, "$1"));
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseStaffCsv(text: string): StaffImportResult {
  const lines = text
    .split(/\r\n|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const valid: StaffImportRow[] = [];
  const errors: StaffImportError[] = [];

  if (lines.length === 0) {
    return { valid, errors: [{ line: 0, message: "File is empty." }] };
  }

  const header = splitCsvLine(lines[0]).map(normalizeHeader);
  const col = (name: string) => header.indexOf(name);
  const nameCol = col("name");
  const roleCol = col("role");
  const payTypeCol = col("pay type");
  const rateCol = col("rate");
  const commissionTypeCol = col("commission type");
  const commissionValueCol = col("commission value");

  if (nameCol === -1 || roleCol === -1 || payTypeCol === -1) {
    return {
      valid,
      errors: [
        {
          line: 1,
          message:
            'Header row must include at least "Name", "Role", and "Pay Type" columns.',
        },
      ],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1;
    const cells = splitCsvLine(lines[i]);

    const name = cells[nameCol]?.trim();
    if (!name) {
      errors.push({ line: lineNumber, message: "Missing name." });
      continue;
    }

    const roleRaw = cells[roleCol]?.trim().toLowerCase();
    const role = roleRaw ? ROLE_ALIASES[roleRaw] : undefined;
    if (!role) {
      errors.push({
        line: lineNumber,
        message: `Unrecognized role "${cells[roleCol] ?? ""}" — expected Waiter, Bar Staff, Manager, Chef, or Cashier.`,
      });
      continue;
    }

    const payTypeRaw = cells[payTypeCol]?.trim().toLowerCase();
    const payType = payTypeRaw ? PAY_TYPE_ALIASES[payTypeRaw] : undefined;
    if (!payType) {
      errors.push({
        line: lineNumber,
        message: `Unrecognized pay type "${cells[payTypeCol] ?? ""}" — expected daily, monthly, or commission.`,
      });
      continue;
    }

    const rateRaw = rateCol !== -1 ? cells[rateCol]?.trim() : "";
    const rate = rateRaw ? Number(rateRaw) : 0;
    if (rateRaw && Number.isNaN(rate)) {
      errors.push({ line: lineNumber, message: `Invalid rate "${rateRaw}".` });
      continue;
    }
    if (payType !== "commission" && (!rateRaw || rate <= 0)) {
      errors.push({
        line: lineNumber,
        message: `Rate is required and must be greater than 0 for pay type "${payType}".`,
      });
      continue;
    }

    let commissionType: CommissionType | undefined;
    let commissionValue: number | undefined;
    if (payType === "commission") {
      const commissionTypeRaw =
        commissionTypeCol !== -1
          ? cells[commissionTypeCol]?.trim().toLowerCase()
          : "";
      commissionType = commissionTypeRaw
        ? COMMISSION_TYPE_ALIASES[commissionTypeRaw]
        : "percent_of_sales";
      if (!commissionType) {
        errors.push({
          line: lineNumber,
          message: `Unrecognized commission type "${cells[commissionTypeCol] ?? ""}" — expected percent_of_sales or flat_per_order.`,
        });
        continue;
      }
      const commissionValueRaw =
        commissionValueCol !== -1 ? cells[commissionValueCol]?.trim() : "";
      commissionValue = commissionValueRaw
        ? Number(commissionValueRaw)
        : NaN;
      if (!commissionValueRaw || Number.isNaN(commissionValue)) {
        errors.push({
          line: lineNumber,
          message: "Commission value is required for pay type \"commission\".",
        });
        continue;
      }
    }

    valid.push({
      name,
      role,
      payType,
      rate,
      commissionType,
      commissionValue,
    });
  }

  return { valid, errors };
}
