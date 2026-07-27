"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  ApiError,
  createPlaylist,
  listPlaylists,
  listTags,
  type Playlist,
  type SmartPlaylistRules,
  type Tag,
} from "@/lib/api-client";
import {
  Alert,
  AppShell,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  MediaCard,
  MediaGrid,
  PageHeader,
} from "@/components/ui";

export default function PlaylistsPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Smart playlist create form
  const [tags, setTags] = useState<Tag[]>([]);
  const [smartName, setSmartName] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [minRating, setMinRating] = useState("");
  const [tagId, setTagId] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");

  function refresh() {
    listPlaylists()
      .then((page) => setPlaylists(page.items))
      .catch(() => setError("Failed to load playlists."));
  }

  useEffect(() => {
    if (!me) return;
    refresh();
    listTags()
      .then((res) => setTags(res.items))
      .catch(() => {});
  }, [me]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createPlaylist({ name });
      setName("");
      refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.problem.detail ?? err.message)
          : "Failed to create playlist.",
      );
    }
  }

  async function handleCreateSmart(event: FormEvent) {
    event.preventDefault();
    setError(null);

    // Only include rules the user actually set.
    const rulesJson: SmartPlaylistRules = {};
    if (favorite) rulesJson.favorite = true;
    if (minRating.trim() !== "") rulesJson.minRating = Number(minRating);
    if (tagId) rulesJson.tagId = tagId;
    if (yearFrom.trim() !== "") rulesJson.yearFrom = Number(yearFrom);
    if (yearTo.trim() !== "") rulesJson.yearTo = Number(yearTo);

    try {
      await createPlaylist({ name: smartName, type: "smart", rulesJson });
      setSmartName("");
      setFavorite(false);
      setMinRating("");
      setTagId("");
      setYearFrom("");
      setYearTo("");
      refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.problem.detail ?? err.message)
          : "Failed to create smart playlist.",
      );
    }
  }

  if (authLoading || !me) return null;

  return (
    <AppShell width="wide">
      <PageHeader title="Playlists" subtitle={`${playlists.length} collections`} />

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <form onSubmit={handleCreate} className="form-row">
          <input
            required
            placeholder="New collection name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
          <Button type="submit" variant="primary">
            Create
          </Button>
        </form>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <Card
          title={
            <>
              Smart playlist <Badge tone="success">Smart</Badge>
            </>
          }
        >
          <form onSubmit={handleCreateSmart}>
            <Field label="Smart playlist name">
              <input
                required
                placeholder="e.g. Top-rated 2010s favorites…"
                value={smartName}
                onChange={(e) => setSmartName(e.target.value)}
                className="input"
              />
            </Field>
            <div className="form-row">
              <Field label="Min rating">
                <input
                  type="number"
                  min={1}
                  max={10}
                  placeholder="Any"
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Tag">
                <select value={tagId} onChange={(e) => setTagId(e.target.value)} className="select">
                  <option value="">Any tag</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.category}: {tag.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Year from">
                <input
                  type="number"
                  placeholder="Any"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Year to">
                <input
                  type="number"
                  placeholder="Any"
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value)}
                  className="input"
                />
              </Field>
            </div>
            <label className="checkbox-row field">
              <input
                type="checkbox"
                checked={favorite}
                onChange={(e) => setFavorite(e.target.checked)}
              />
              Favorites only
            </label>
            <Button type="submit" variant="primary">
              Create smart playlist
            </Button>
          </form>
        </Card>
      </div>

      {error && <Alert>{error}</Alert>}
      {playlists.length === 0 && <EmptyState>No playlists yet.</EmptyState>}
      <MediaGrid>
        {playlists.map((playlist) => {
          const isSmart = playlist.type === "smart" || playlist.rulesJson != null;
          return (
            <MediaCard
              key={playlist.id}
              href={`/playlists/${playlist.id}`}
              title={playlist.name}
              subtitle={
                isSmart ? (
                  <Badge tone="success">Smart</Badge>
                ) : (
                  (playlist.description ?? `${playlist.items?.length ?? 0} tracks`)
                )
              }
              icon={isSmart ? "♪" : "☰"}
              tone={isSmart ? "green" : "mixed"}
            />
          );
        })}
      </MediaGrid>
    </AppShell>
  );
}
