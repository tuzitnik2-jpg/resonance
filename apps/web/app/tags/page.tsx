"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  ApiError,
  createTag,
  deleteTag,
  listTags,
  updateTag,
  type Tag,
  type TagCategory,
} from "@/lib/api-client";
import { Alert, AppShell, Button, Card, EmptyState, PageHeader } from "@/components/ui";

const CATEGORIES: TagCategory[] = ["GENRE", "THEME", "MOOD", "DANCE", "USAGE", "LANGUAGE"];

export default function TagsPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<TagCategory>("GENRE");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    listTags()
      .then((page) => setTags(page.items))
      .catch(() => setError("Failed to load tags."));
  }

  useEffect(() => {
    if (!me) return;
    refresh();
  }, [me]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createTag({ name, category });
      setName("");
      refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? (err.problem.detail ?? err.message) : "Failed to add tag.",
      );
    }
  }

  async function handleRename(id: string) {
    await updateTag(id, { name: editingName });
    setEditingId(null);
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this tag?")) return;
    await deleteTag(id);
    refresh();
  }

  if (authLoading || !me) return null;

  const grouped = CATEGORIES.map((cat) => ({ cat, items: tags.filter((t) => t.category === cat) }));

  return (
    <AppShell>
      <PageHeader title="Tags" subtitle={`${tags.length} total`} />

      <Card title="Add tag">
        <form onSubmit={handleCreate} className="form-row">
          <input
            required
            placeholder="New tag name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TagCategory)}
            className="select"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <Button type="submit" variant="primary">
            Add
          </Button>
        </form>
        {error && <Alert>{error}</Alert>}
      </Card>

      <div className="section-stack" style={{ marginTop: "1.25rem" }}>
        {grouped.map(({ cat, items }) => (
          <Card key={cat} title={cat}>
            {items.length === 0 && <EmptyState>No tags yet.</EmptyState>}
            <ul className="list">
              {items.map((tag) => (
                <li key={tag.id} className="list-row">
                  {editingId === tag.id ? (
                    <>
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="input"
                        style={{ flex: 1 }}
                      />
                      <span className="list-row-side">
                        <Button size="sm" onClick={() => handleRename(tag.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="list-row-main">{tag.name}</span>
                      <span className="list-row-side">
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingId(tag.id);
                            setEditingName(tag.name);
                          }}
                        >
                          Rename
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(tag.id)}>
                          Delete
                        </Button>
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
