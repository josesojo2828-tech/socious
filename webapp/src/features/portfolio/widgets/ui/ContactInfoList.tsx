import type { ReactNode } from "react";

interface ContactInfoItem {
  icon: ReactNode;
  label: string;
  href?: string;
  isExternal?: boolean;
}

interface ContactInfoListProps {
  items: ContactInfoItem[];
}

export function ContactInfoList({ items }: ContactInfoListProps) {
  return (
    <div className="space-y-4">
      {items.map((item, idx) => {
        const content = (
          <div className="flex items-center gap-4 group">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:bg-white/25 transition-colors">
              {item.icon}
            </div>
            <span className="text-sm md:text-base font-medium text-white/90 group-hover:text-white transition-colors break-all">
              {item.label}
            </span>
          </div>
        );

        if (item.href) {
          return (
            <a
              key={idx}
              href={item.href}
              target={item.isExternal ? "_blank" : undefined}
              rel={item.isExternal ? "noopener noreferrer" : undefined}
            >
              {content}
            </a>
          );
        }

        return <div key={idx}>{content}</div>;
      })}
    </div>
  );
}
