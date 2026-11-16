"use client";

import { Children, isValidElement, useEffect, useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement(node)) {
    return nodeText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function codeLanguage(children: ReactNode): string | null {
  const first = Children.toArray(children)[0];
  if (!isValidElement(first)) return null;
  const className = (first.props as { className?: unknown }).className;
  if (typeof className !== "string") return null;
  return /(?:^|\s)language-([\w-]+)/.exec(className)?.[1] ?? null;
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const language = codeLanguage(children);
  const text = nodeText(children).replace(/\n$/, "");

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard access can be blocked by the browser; leave the label unchanged.
    }
  }

  return (
    <div className="code-block">
      <div className="code-block-toolbar">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {language ?? "Code"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h8" strokeLinecap="round" />
          </svg>
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

const components: Components = {
  pre({ children }) {
    return <CodeBlock>{children}</CodeBlock>;
  },
  a({ href, title, children }) {
    const external = typeof href === "string" && /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        title={title}
        {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      >
        {children}
      </a>
    );
  },
  img({ alt }) {
    return (
      <span className="my-1 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-2 py-1 text-xs text-muted-foreground">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="m3 15 4.5-4.5 4 4L15 11l6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Image not shown{alt ? `: ${alt}` : ""}
      </span>
    );
  },
  table({ children }) {
    return (
      <div className="markdown-table-wrap">
        <table>{children}</table>
      </div>
    );
  },
};

export function MessageMarkdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: false }]]}
        components={components}
      >
        {children}
      </Markdown>
    </div>
  );
}
