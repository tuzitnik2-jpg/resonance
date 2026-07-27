export function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | undefined): string | undefined {
  if (!cursor) return undefined;
  return Buffer.from(cursor, "base64url").toString("utf8");
}
