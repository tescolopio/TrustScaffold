import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { MermaidDiagram } from '@/components/documents/mermaid-diagram';
import { cn } from '@/lib/utils';

function stripFrontmatter(markdown: string) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

export function MarkdownDocument({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <article className={cn('max-w-none text-sm leading-7 text-foreground md:text-base', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ className: nodeClassName, ...props }) => <h1 {...props} className={cn('mb-5 text-3xl font-bold leading-tight text-foreground', nodeClassName)} />,
          h2: ({ className: nodeClassName, ...props }) => <h2 {...props} className={cn('mb-3 mt-8 border-b border-border pb-2 text-xl font-semibold leading-tight text-foreground first:mt-0', nodeClassName)} />,
          h3: ({ className: nodeClassName, ...props }) => <h3 {...props} className={cn('mb-2 mt-6 text-lg font-semibold leading-tight text-foreground', nodeClassName)} />,
          h4: ({ className: nodeClassName, ...props }) => <h4 {...props} className={cn('mb-2 mt-5 text-base font-semibold leading-tight text-foreground', nodeClassName)} />,
          h5: ({ className: nodeClassName, ...props }) => <h5 {...props} className={cn('mb-2 mt-4 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground', nodeClassName)} />,
          h6: ({ className: nodeClassName, ...props }) => <h6 {...props} className={cn('mb-2 mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground', nodeClassName)} />,
          p: ({ className: nodeClassName, ...props }) => <p {...props} className={cn('my-3 text-foreground', nodeClassName)} />,
          ul: ({ className: nodeClassName, ...props }) => <ul {...props} className={cn('my-4 list-disc space-y-2 pl-6 text-foreground marker:text-muted-foreground', nodeClassName)} />,
          ol: ({ className: nodeClassName, ...props }) => <ol {...props} className={cn('my-4 list-decimal space-y-2 pl-6 text-foreground marker:text-muted-foreground', nodeClassName)} />,
          li: ({ className: nodeClassName, ...props }) => <li {...props} className={cn('pl-1 text-foreground [&>ol]:my-2 [&>ul]:my-2', nodeClassName)} />,
          strong: ({ className: nodeClassName, ...props }) => <strong {...props} className={cn('font-semibold text-foreground', nodeClassName)} />,
          em: ({ className: nodeClassName, ...props }) => <em {...props} className={cn('italic text-foreground', nodeClassName)} />,
          a: ({ className: nodeClassName, ...props }) => <a {...props} className={cn('text-primary underline underline-offset-4', nodeClassName)} target="_blank" rel="noreferrer" />,
          blockquote: ({ className: nodeClassName, ...props }) => <blockquote {...props} className={cn('my-5 border-l-4 border-primary/40 bg-secondary/30 py-2 pl-4 text-muted-foreground', nodeClassName)} />,
          hr: ({ className: nodeClassName, ...props }) => <hr {...props} className={cn('my-8 border-border', nodeClassName)} />,
          code: ({ className: nodeClassName, children, ...props }) => {
            const textContent = String(children).replace(/\n$/, '');
            const isMermaidBlock = typeof nodeClassName === 'string' && nodeClassName.includes('language-mermaid');

            if (isMermaidBlock) {
              return <MermaidDiagram chart={textContent} />;
            }

            return <code {...props} className={cn('rounded bg-secondary px-1.5 py-0.5 text-sm text-foreground', nodeClassName)}>{children}</code>;
          },
          pre: ({ className: nodeClassName, ...props }) => <pre {...props} className={cn('my-5 overflow-x-auto rounded-2xl border border-border bg-secondary/40 p-4 text-sm text-foreground', nodeClassName)} />,
          table: ({ className: nodeClassName, ...props }) => (
            <div className="my-6 overflow-x-auto rounded-2xl border border-border">
              <table {...props} className={cn('min-w-full border-collapse text-sm', nodeClassName)} />
            </div>
          ),
          th: ({ className: nodeClassName, ...props }) => <th {...props} className={cn('border-b border-r border-border bg-secondary px-3 py-2 text-left font-semibold text-foreground last:border-r-0', nodeClassName)} />,
          td: ({ className: nodeClassName, ...props }) => <td {...props} className={cn('border-b border-r border-border px-3 py-2 align-top text-foreground last:border-r-0', nodeClassName)} />,
          input: ({ className: nodeClassName, ...props }) => <input {...props} className={cn('mr-2 align-middle accent-primary', nodeClassName)} disabled />,
        }}
      >
        {stripFrontmatter(markdown)}
      </ReactMarkdown>
    </article>
  );
}