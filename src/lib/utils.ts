import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | bigint): string {
  const numeric = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  
  // FIX HYDRATION ERROR: Hardcode prefix "Rp " manual + number format dasar
  // Mencegah bentrok render SSR Node.js ("IDR 0") vs Browser ("Rp 0")
  return "Rp " + new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.substring(1);
  }
  return cleaned;
}
