import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={twMerge(
          clsx(
            "h-10 rounded-md bg-blue-600 px-4 text-white hover:bg-blue-700 transition-colors",
            className
          )
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
