import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva("button", {
  variants: {
    variant: { default: "button-primary", secondary: "button-secondary", ghost: "button-ghost", danger: "button-danger" },
    size: { default: "", lg: "button-lg", icon: "button-icon" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export function Button({ className, variant, size, asChild, ...props }: ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot.Root : "button";
  return <Component data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
