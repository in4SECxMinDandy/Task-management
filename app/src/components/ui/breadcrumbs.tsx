import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Breadcrumb item.
 *  - `to` undefined → renders as plain text (current page).
 *  - `to` set       → renders as a Link.
 */
export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumbs (Design System §3 — Information Architecture).
 *
 * Place at the top-left of every detail page so the user always knows
 * where they are and can step back without using the browser back button.
 *
 * Example:
 *   <Breadcrumbs items={[
 *     { label: "Công việc", to: "/tasks" },
 *     { label: task.title },
 *   ]} />
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}
    >
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {it.to && !last ? (
              <Link
                to={it.to}
                className="rounded px-1 transition-colors hover:bg-accent hover:text-foreground active:bg-accent/80"
              >
                {it.label}
              </Link>
            ) : (
              <span
                className={cn("px-1", last && "font-medium text-foreground")}
                aria-current={last ? "page" : undefined}
              >
                {it.label}
              </span>
            )}
            {!last && <ChevronRight className="h-3 w-3 shrink-0" />}
          </span>
        );
      })}
    </nav>
  );
}
