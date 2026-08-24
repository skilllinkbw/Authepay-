import * as React from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={twMerge(clsx("flex h-10 w-full rounded-md border-gray-300 px-3 py-2", className))}
      {...props}
    />
  )
}
