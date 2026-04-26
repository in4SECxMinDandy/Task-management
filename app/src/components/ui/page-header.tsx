import * as React from "react";
import { cn } from "@/lib/utils";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  /** Right-side actions (primary CTA goes here, top-right per F-pattern). */
  actions?: React.ReactNode;
  /** Optional breadcrumbs displayed above the title. */
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

/**
 * PageHeader (Design System §3 — Visual Hierarchy).
 *
 * Layout per F-pattern reading flow:
 *   ┌──────────────────────────────────────────────────────┐
 *   │ Breadcrumbs                                          │
 *   │ Title (text-h1)                  [Primary action(s)] │
 *   │ Description / caption                                │
 *   └──────────────────────────────────────────────────────┘
 *
 * Use this on every page instead of an ad-hoc `<div className="flex...">`
 * so spacing, typography and action-placement stay consistent.
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-h1">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
