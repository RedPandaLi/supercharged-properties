/** Build an Obsidian property query. Search applies its own matching/type semantics. */
export function propertyQuery(key: string, value?: string, empty = false): string {
  const quote = (text: string) => JSON.stringify(text);
  return value === undefined ? `[${quote(key)}]` : `[${quote(key)}:${empty ? 'null' : quote(value)}]`;
}
