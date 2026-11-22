import React from "react";

interface BrandMarkProps {
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ className = "h-8 w-8" }) => {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-700/20 dark:border-emerald-400/20 ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4.5 w-4.5 fill-none stroke-current"
        strokeWidth={1.85}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2.5 20 7v10l-8 4.5L4 17V7l8-4.5Z" />
        <path d="M8.5 15.5V9h4.2a2.3 2.3 0 0 1 .7 4.5L15.5 16.5M8.5 12.2h4" />
      </svg>
    </span>
  );
};
