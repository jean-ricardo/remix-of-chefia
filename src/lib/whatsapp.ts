// Utility helpers for the WhatsApp phone field.
// Mask format: +55 (XX) XXXXX-XXXX

export function formatWhatsApp(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 13); // 55 + 2 DDD + 9 number
  if (digits.length === 0) return "";

  // Ensure country code prefix logic: if user starts typing without 55, we still
  // format progressively as (XX) XXXXX-XXXX and prepend +55 lazily.
  let cc = "";
  let rest = digits;
  if (digits.startsWith("55") && digits.length > 2) {
    cc = digits.slice(0, 2);
    rest = digits.slice(2);
  } else if (digits.length > 11) {
    cc = digits.slice(0, digits.length - 11);
    rest = digits.slice(digits.length - 11);
  }

  const ddd = rest.slice(0, 2);
  const p1 = rest.slice(2, 7);
  const p2 = rest.slice(7, 11);

  let out = "";
  if (cc) out += `+${cc} `;
  else if (rest.length >= 2) out += "+55 ";
  if (ddd) out += `(${ddd}`;
  if (ddd.length === 2) out += ")";
  if (p1) out += ` ${p1}`;
  if (p2) out += `-${p2}`;
  return out.trim();
}

export function isValidWhatsApp(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  // Accept 10 or 11 digit local numbers, optionally prefixed with country code 55.
  return digits.length >= 10 && digits.length <= 13;
}
