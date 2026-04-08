#!/bin/bash
# Export all agent prompts from the database to individual markdown files
# Usage: bash scripts/export-agent-prompts.sh

set -euo pipefail

DB_URL="${DATABASE_URL:-postgres://claude_user:claude_password@localhost:5432/claude_projects}"
OUTPUT_DIR="docs/agent-prompts"

mkdir -p "$OUTPUT_DIR"

# Get all agents as JSON
AGENTS_JSON=$(psql "$DB_URL" -t -A -c "
SELECT json_agg(json_build_object(
  'name', name,
  'description', COALESCE(description, ''),
  'system_prompt', system_prompt,
  'provider', provider,
  'model', model,
  'temperature', temperature,
  'max_tokens', max_tokens
) ORDER BY name)
FROM agents;
" 2>/dev/null)

if [ -z "$AGENTS_JSON" ] || [ "$AGENTS_JSON" = "NULL" ]; then
  echo "ERROR: No agents found or database not accessible"
  exit 1
fi

# Use node to parse JSON and write files
node -e "
const agents = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
let count = 0;

agents.forEach(agent => {
  const safeName = agent.name
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const md = \`# \${agent.name}

| Field | Value |
|-------|-------|
| **Provider** | \${agent.provider} |
| **Model** | \${agent.model} |
| **Temperature** | \${agent.temperature} |
| **Max Tokens** | \${agent.max_tokens} |

\${agent.description ? \`## Description

\${agent.description}

\` : ''}## System Prompt

\\\`\\\`\\\`
\${agent.system_prompt}
\\\`\\\`\\\`
\`;

  const filepath = '$OUTPUT_DIR/' + safeName + '.md';
  require('fs').writeFileSync(filepath, md);
  console.log('Created: ' + filepath);
  count++;
});

console.log('\\nDone: ' + count + ' agent prompts exported to $OUTPUT_DIR/');
" <<< "$AGENTS_JSON"
