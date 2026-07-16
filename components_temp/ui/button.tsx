import { Slot } from "@radix-ui/react-slot"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ReactNode } from "react"

export function Button({ className, children, ...props }: {className?: string, children: ReactNode}) {
  return <button className={twMerge(clsx("bg-blue-600 text-white rounded-md px-4 py-2", className))} {...props}>{children}</button>
}
