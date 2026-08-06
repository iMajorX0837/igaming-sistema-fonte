#!/usr/bin/env bash
# Helpers compartilhados (ops-panel roda jobs com node, não python3).

resolve_node() {
  if command -v node >/dev/null 2>&1; then
    REPO_NODE=node
    return 0
  fi
  if command -v nodejs >/dev/null 2>&1; then
    REPO_NODE=nodejs
    return 0
  fi
  echo "Erro: node/nodejs não encontrado." >&2
  return 1
}

run_node() {
  resolve_node || exit 127
  "$REPO_NODE" "$@"
}
