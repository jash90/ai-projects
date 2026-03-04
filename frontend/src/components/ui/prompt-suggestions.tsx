interface PromptSuggestionsProps {
  label: string
  append: (message: { role: "user"; content: string }) => void
  suggestions: string[]
}

export function PromptSuggestions({
  label,
  append,
  suggestions,
}: PromptSuggestionsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-center text-2xl font-bold">{label}</h2>
      <div className="flex gap-6 text-sm flex-wrap justify-center">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => append({ role: "user", content: suggestion })}
            className="h-max flex-1 min-w-[200px] max-w-[280px] rounded-xl border bg-background p-4 hover:bg-muted transition-colors"
          >
            <p>{suggestion}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
