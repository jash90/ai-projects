interface TokenMetaBadgeProps {
  metadata?: Record<string, any>
}

function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return tokens.toString()
}

export function TokenMetaBadge({ metadata }: TokenMetaBadgeProps) {
  if (!metadata || Object.keys(metadata).length === 0) return null

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {metadata.model && (
        <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{metadata.model}</span>
      )}
      {(metadata.prompt_tokens != null || metadata.completion_tokens != null) ? (
        <span className="flex items-center gap-0.5 text-[10px]">
          {metadata.prompt_tokens != null && (
            <span title="Input tokens">{formatTokenCount(metadata.prompt_tokens)} in</span>
          )}
          {metadata.prompt_tokens != null && metadata.completion_tokens != null && (
            <span>/</span>
          )}
          {metadata.completion_tokens != null && (
            <span title="Output tokens">{formatTokenCount(metadata.completion_tokens)} out</span>
          )}
        </span>
      ) : metadata.tokens != null && metadata.tokens > 0 ? (
        <span className="text-[10px]">{formatTokenCount(metadata.tokens)} tokens</span>
      ) : null}
      {metadata.estimated_cost != null && Number(metadata.estimated_cost) > 0 && (
        <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]" title="Estimated cost">
          ${Number(metadata.estimated_cost) < 0.01
            ? Number(metadata.estimated_cost).toFixed(4)
            : Number(metadata.estimated_cost).toFixed(2)}
        </span>
      )}
    </div>
  )
}
