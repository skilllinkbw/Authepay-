import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { fromMinor } from "./money";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Display an integer minor-unit amount as a localized currency string. */
export function formatMinorAmount(
  amountMinor: number,
  currency: string = "BWP"
): string {
  return new Intl.NumberFormat("en-BW", {
    style: "currency",
    currency,
  }).format(Number.parseFloat(fromMinor(amountMinor, currency as "BWP")));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BW", {
    style: "currency",
    currency: "BWP",
  }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-BW");
}
