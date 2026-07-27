"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { listTags, type Tag, type TagCategory } from "@/lib/api-client";
import { AppShell, EmptyState, Loading, PageHeader, Shelf } from "@/components/ui";

const CATEGORY_ORDER: TagCategory[] = ["GENRE", "MOOD", "THEME", "DANCE", "USAGE", "LANGUAGE"];

const CATEGORY_LABELS: Record<TagCategory, string> = {
  GENRE: "Genres",
  THEME: "Themes",
  MOOD: "Moods",
  DANCE: "Dance",
  USAGE: "Uses",
  LANGUAGE: "Languages",
};

// Curated reggae-flavoured palette; tiles cycle through it by index.
const PALETTE = [
  "#1a8043", // deep green
  "#d99a10", // gold
  "#c8382a", // scarlet
  "#147a6a", // teal
  "#6a1f5f", // purple
  "#c85a1a", // orange
  "#2a3a8a", // indigo
  "#a11a5c", // magenta
];

export default function BrowsePage() {
  const { me, loading: authLoading } = useCurrentUser();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) return;
    listTags()
      .then((page) => setTags(page.items))
      .finally(() => setLoading(false));
  }, [me]);

  if (authLoading || !me) return null;

  const byCategory = CATEGORY_ORDER.map((category) => ({
    category,
    tags: tags.filter((tag) => tag.category === category),
  })).filter((group) => group.tags.length > 0);

  return (
    <AppShell width="wide">
      <PageHeader title="Browse" subtitle="Explore your library by genre, mood, and more" />
      {loading && <Loading />}
      {!loading && tags.length === 0 && (
        <EmptyState>No tags yet — add some to your songs to browse by category.</EmptyState>
      )}
      {!loading &&
        byCategory.map((group) => (
          <Shelf key={group.category} title={CATEGORY_LABELS[group.category]}>
            <div className="browse-grid">
              {group.tags.map((tag, index) => (
                <Link
                  key={tag.id}
                  href={`/songs?tagId=${tag.id}`}
                  className="browse-tile"
                  style={{ background: PALETTE[index % PALETTE.length] }}
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          </Shelf>
        ))}
    </AppShell>
  );
}
