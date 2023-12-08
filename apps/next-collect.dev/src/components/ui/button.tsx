import * as React from "react"
import { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { cva, type VariantProps } from "class-variance-authority"
import { Simplify } from "type-fest"

import Link from "next/link"

const buttonVariants = cva(["font-semibold", "border", "rounded"], {
  variants: {
    intent: {
      primary: [
        "bg-neutral-900",
        "text-neutral-100",
        "border-transparent",
        "hover:bg-neutral-700",
        "transition-colors duration-200",
      ],
      secondary: [
        "bg-transparent",
        "text-neutral-700",
        "border-neutral-400",
        "hover:border-neutral-600 hover:text-neutral-900",
        "transition-colors duration-200",
      ],
    },
    size: {
      small: ["text-sm", "py-1", "px-2"],
      medium: ["text-base", "py-2", "px-4"],
    },
  },
  defaultVariants: {
    intent: "primary",
    size: "medium",
  },
})

export type ButtonProps = Simplify<
  { icon?: React.ReactNode; className?: string; children: ReactNode } & VariantProps<typeof buttonVariants> &
    ({ href: string } | ({ href?: never } & React.ButtonHTMLAttributes<HTMLButtonElement>))
>

export const Button: React.FC<ButtonProps> = ({ intent, size, icon, className, children, href, ...props }) => {
  const newProps = {
    className: cn(buttonVariants({ intent, size }), className),
    href,
    children: (
      <span className="flex flex-nowrap space-x-1.5 items-center">
        {icon && <span className="h-5 w-5">{icon}</span>}
        <span>{children}</span>
      </span>
    ),
    ...props,
  }
  const LinkAny = Link as any
  return href ? <LinkAny {...newProps} /> : <button {...newProps} />
}
