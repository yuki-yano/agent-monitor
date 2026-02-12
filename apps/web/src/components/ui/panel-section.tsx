import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type PanelSectionProps = HTMLAttributes<HTMLDivElement>;

const PanelSection = ({ className, ...props }: PanelSectionProps) => {
  return (
    <div
      className={cn("border-latte-surface2/70 border-t px-2 py-1.5 sm:px-3 sm:py-2", className)}
      {...props}
    />
  );
};

export { PanelSection };
