import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    return <button className={cn("h-10 rounded-md bg-blue-600 px-4 text-white hover:bg-blue-700", className)} ref={ref} {...props} />
  }
)
Button.displayName = "Button"
