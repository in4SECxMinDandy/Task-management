import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

interface Props {
  options: Profile[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiSelectAssignees({
  options,
  value,
  onChange,
  placeholder = "Chọn nhân viên",
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(value), [value]);
  const selectedProfiles = useMemo(
    () => value.map((id) => options.find((o) => o.id === id)).filter(Boolean) as Profile[],
    [value, options],
  );

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter(
        (o) =>
          o.full_name.toLowerCase().includes(q) ||
          o.email.toLowerCase().includes(q) ||
          (o.department ?? "").toLowerCase().includes(q),
      )
    : options;

  const toggle = (id: string) => {
    onChange(selectedSet.has(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const remove = (id: string) => onChange(value.filter((v) => v !== id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "h-auto min-h-9 w-full justify-between gap-2 px-3 py-2 text-left font-normal",
            value.length === 0 && "text-muted-foreground",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {selectedProfiles.length === 0 ? (
              <span>{placeholder}</span>
            ) : (
              selectedProfiles.map((p) => (
                <Badge key={p.id} variant="secondary" className="gap-1 px-2 py-0.5">
                  <span className="max-w-[140px] truncate">{p.full_name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      remove(p.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        remove(p.id);
                      }
                    }}
                    className="-mr-1 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Tìm theo tên, email, phòng ban..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>
        <ul className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-4 text-center text-xs text-muted-foreground">
              Không tìm thấy nhân viên.
            </li>
          ) : (
            filtered.map((p) => {
              const checked = selectedSet.has(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                      checked && "bg-accent/50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{p.full_name}</span>
                        {p.role === "admin" && (
                          <Badge variant="info" className="px-1.5 py-0 text-[10px]">
                            admin
                          </Badge>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {p.email}
                        {p.department ? ` · ${p.department}` : ""}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
        {value.length > 0 && (
          <div className="flex items-center justify-between border-t p-2 text-xs">
            <span className="text-muted-foreground">Đã chọn {value.length} người</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onChange([])}
            >
              Xóa tất cả
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
