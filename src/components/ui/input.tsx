import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 min-h-11 w-full rounded-md bg-well px-3 font-sans text-sm text-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_14%,transparent)] transition-[box-shadow] duration-150 ease-out placeholder:text-muted focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-olive)] disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
