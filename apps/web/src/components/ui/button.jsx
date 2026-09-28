import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Botón — especificación Inventoros/Linear:
 * - radius 8px (rounded-lg), texto 14px/500, gap 8px entre icono y texto
 * - default  h-10 (40px) px-4
 * - outline  blanco, borde #E5E7EB, texto #0F1729, hover #F9FAFB
 * - danger   #DC2626 / hover #B91C1C / texto blanco
 * - success  #22C55E / hover #16A34A / texto blanco
 * - disabled 50% de opacidad (mismo botón, pointer-events none)
 * - iconos lucide 16px ([&_svg]:size-4) a la izquierda del texto
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",        // #2563EB / hover #1D4ED8
        destructive: "bg-[#DC2626] text-white hover:bg-[#B91C1C]",                 // danger rojo
        success: "bg-[#22C55E] text-white hover:bg-[#16A34A]",                     // verde (Soporte)
        outline:
          "border border-[hsl(220_14%_91%)] bg-white text-[hsl(221_39%_11%)] hover:bg-[#F9FAFB] dark:bg-transparent dark:text-[hsl(220_10%_96%)] dark:hover:bg-[hsl(216_13%_16%)] dark:border-[hsl(220_11%_18%)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",           // 40px, por defecto (capturas)
        sm: "h-8 rounded-md px-3",      // 32px compacto
        lg: "h-10 rounded-lg px-6",     // 40px
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
