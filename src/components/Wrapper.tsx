import clsx from "clsx";
import { FC, ReactNode } from "react";


type Props = {
  title: string;
  tags: string[];
  className?: string;
  children: ReactNode;
};

export const slugify = (s: string) =>
  s
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-and-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");

export default (({ title, tags, children, className }) => (
  <article>
    <div
      className={clsx(
        "my-4 flex min-h-96 w-full items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100/25 dark:border-neutral-700/50 dark:bg-neutral-900",
        className,
      )}
    >
      {children}
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-x-2">
        {tags.map((tag, index) => (
          <div
            key={index}
            className="cursor-default rounded bg-neutral-200 px-2 py-1 text-xs tracking-tight text-neutral-600 dark:bg-neutral-800 dark:text-neutral-500"
          >
            {tag}
          </div>
        ))}
      </div>
      
    </div>
  </article>
)) as FC<Props>;