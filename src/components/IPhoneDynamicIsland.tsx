import clsx from 'clsx';
import { FC, ReactNode } from 'react';
import { HiOutlineArrowUpRight } from 'react-icons/hi2';

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
    .replace(/\s+/g, '-')
    .replace(/&/g, '-and-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');

const DynamicIslandWrapper: FC<Props> = ({ title, tags, children, className }) => (
  <article>
    <div
      className={clsx(
        'my-2 flex w-full items-center justify-center rounded-full border border-neutral-800 bg-neutral-900/90 backdrop-blur-sm py-2 px-4',
        className
      )}
    >
      {children}
    </div>
    <div className="flex items-center justify-between mt-2">
      <div className="flex items-center gap-x-2">
        {tags.map((tag, index) => (
          <div
            key={index}
            className="cursor-default rounded bg-neutral-800 px-2 py-1 text-xs tracking-tight text-neutral-400"
          >
            {tag}
          </div>
        ))}
      </div>
      <a
        className="flex items-center text-sm tracking-tight text-neutral-400"
        href={`https://github.com/haaarshsingh/ui/blob/main/app/%5Bslug%5D/ui/${title.replace(
          /\s+/g,
          ''
        )}.tsx`}
        target="_blank"
        rel="noreferrer"
      >
        View Source
        <HiOutlineArrowUpRight className="ml-1 mt-[1px] text-xs text-neutral-500" />
      </a>
    </div>
  </article>
);

export default DynamicIslandWrapper;