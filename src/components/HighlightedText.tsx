import { highlightMatches } from "@/lib/search/conversation-search";

export function HighlightedText({
  text,
  tokens,
  className,
}: {
  text: string;
  tokens: readonly string[];
  className?: string;
}) {
  if (tokens.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const segments = highlightMatches(text, tokens);

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.match ? (
          <mark
            key={`${index}-${segment.text}`}
            className="rounded-sm bg-accent/20 px-0.5 text-inherit"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={`${index}-${segment.text}`}>{segment.text}</span>
        ),
      )}
    </span>
  );
}
