'use client';

export type TabsItem = {
  value: string;
  label: string;
};

export type TabsProps = {
  value: string;
  onChange: (value: string) => void;
  items: TabsItem[];
};

export function Tabs({ value, onChange, items }: TabsProps) {
  return (
    <div
      role="tablist"
      className="inline-flex flex-wrap gap-1 rounded-button border border-brown-800/15 bg-white p-1"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={`rounded-button px-3.5 py-2.5 text-[15px] font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal-700/15 ${
              active
                ? 'bg-teal-700 text-sand-50 shadow-[0_4px_12px_rgba(29,111,140,0.28)]'
                : 'text-brown-800 hover:bg-sand-50'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
