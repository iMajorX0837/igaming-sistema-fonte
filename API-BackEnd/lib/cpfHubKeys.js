/** CPFHUB_API_KEY pode ter várias chaves separadas por vírgula ou quebra de linha. */
export function parseCpfHubApiKeys(raw) {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,\n]+/)
    .map((key) => key.trim())
    .filter(Boolean);
}
