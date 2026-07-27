export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
}

export interface CursorPageQuery {
  limit?: number;
  cursor?: string;
}
