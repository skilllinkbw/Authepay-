import * as React from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={twMerge(
          clsx(
            "flex h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600",
            className
          )
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"
