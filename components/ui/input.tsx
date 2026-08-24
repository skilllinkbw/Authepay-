import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function Input({ className, ...props }: any) {
  return <input className={twMerge(clsx("flex h-10 w-full rounded-md border-gray-300 px-3 py-2", className))} {...props} />
}
