import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type AsyncSelectOption = {
  value: string;
  label: string;
  description?: string;
};

export function AsyncSelect({
  value,
  onChange,
  loadOptions,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  disabled = false,
}: {
  value?: string;
  onChange: (option: AsyncSelectOption | null) => void;
  loadOptions: () => Promise<AsyncSelectOption[]>;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AsyncSelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuRect, setMenuRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadOptions()
      .then((items) => {
        if (mounted) {
          setOptions(items);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [loadOptions]);

  const selected = useMemo(
    () => options.find((item) => item.value === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((item) => {
      return (
        item.label.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.value.toLowerCase().includes(term)
      );
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePosition = () => {
      if (!buttonRef.current) {
        return;
      }
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuRect({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={selected ? "text-white" : "text-slate-400"}>
          {selected?.label ?? placeholder}
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
          {selected ? "Selected" : "Pick"}
        </span>
      </button>

      {open && menuRect && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[9999] rounded-3xl border border-white/10 bg-slate-950 p-3 shadow-2xl shadow-black/40"
              style={{
                top: menuRect.top,
                left: menuRect.left,
                width: menuRect.width,
              }}
            >
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="mb-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <div className="max-h-60 overflow-auto">
                {loading ? (
                  <div className="py-4 text-center text-sm text-slate-400">
                    Loading options...
                  </div>
                ) : null}
                {!loading && filteredOptions.length === 0 ? (
                  <div className="py-4 text-center text-sm text-slate-400">
                    No matching options
                  </div>
                ) : null}
                {!loading
                  ? filteredOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onChange(option);
                          setOpen(false);
                          setQuery("");
                        }}
                        className="flex w-full flex-col gap-1 rounded-2xl px-4 py-3 text-left text-sm text-white transition hover:bg-white/10"
                      >
                        <span className="font-medium">{option.label}</span>
                        {option.description ? (
                          <span className="text-xs text-slate-400">
                            {option.description}
                          </span>
                        ) : null}
                      </button>
                    ))
                  : null}
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white"
                >
                  Close
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
