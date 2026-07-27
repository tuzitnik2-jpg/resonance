"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { Alert, AppShell, Badge, Button, Card, EmptyState, Hero } from "@/components/ui";
import {
  ApiError,
  attachTag,
  createExternalLink,
  createMemory,
  createTag,
  deleteExternalLink,
  deleteMemory,
  deleteSong,
  detachTag,
  generateSongAnalysis,
  getSong,
  listExternalLinks,
  listMemories,
  listSongAnalyses,
  listTags,
  updateSongUserData,
  verifyExternalLink,
  type AnalysisType,
  type ExternalLink as ExternalLinkType,
  type Memory,
  type Song,
  type SongAnalysis,
  type Tag,
} from "@/lib/api-client";

const ANALYSIS_TYPES: AnalysisType[] = [
  "MEANING",
  "STYLE",
  "MOOD_ENERGY",
  "DANCE",
  "REELS",
  "FESTIVAL",
  "COLLECTION",
];

export default function SongDetailPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [song, setSong] = useState<Song | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [links, setLinks] = useState<ExternalLinkType[]>([]);
  const [analyses, setAnalyses] = useState<SongAnalysis[]>([]);
  const [rating, setRating] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [energyLevel, setEnergyLevel] = useState("");
  const [note, setNote] = useState("");
  const [newTagId, setNewTagId] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [memoryTitle, setMemoryTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkProvider, setLinkProvider] = useState("spotify");
  const [analysisType, setAnalysisType] = useState<AnalysisType>("MEANING");
  const [generating, setGenerating] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    getSong(id).then((s) => {
      setSong(s);
      const userData = s.userData?.[0];
      setRating(userData?.rating?.toString() ?? "");
      setFavorite(userData?.favorite ?? false);
      setEnergyLevel(userData?.energyLevel?.toString() ?? "");
      setNote(userData?.userNote ?? "");
    });
    listMemories({ entityType: "song", entityId: id }).then((page) => setMemories(page.items));
    listExternalLinks("song", id).then((page) => setLinks(page.items));
    listSongAnalyses(id).then((page) => setAnalyses(page.items));
  }

  useEffect(() => {
    if (!me) return;
    refresh();
    listTags().then((page) => setAllTags(page.items));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, id]);

  async function handleSaveRelationship(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await updateSongUserData(id, {
        rating: rating ? Number(rating) : null,
        favorite,
        energyLevel: energyLevel ? Number(energyLevel) : null,
        userNote: note || null,
      });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? (err.problem.detail ?? err.message) : "Save failed.");
    }
  }

  async function handleAttachTag(event: FormEvent) {
    event.preventDefault();
    if (!newTagId) return;
    await attachTag(id, newTagId);
    setNewTagId("");
    refresh();
  }

  async function handleCreateAndAttachTag(event: FormEvent) {
    event.preventDefault();
    if (!newTagName) return;
    const tag = await createTag({ name: newTagName, category: "GENRE" });
    await attachTag(id, tag.id);
    setNewTagName("");
    listTags().then((page) => setAllTags(page.items));
    refresh();
  }

  async function handleDetachTag(tagId: string) {
    await detachTag(id, tagId);
    refresh();
  }

  async function handleAddMemory(event: FormEvent) {
    event.preventDefault();
    if (!memoryTitle) return;
    await createMemory({ entityType: "song", entityId: id, title: memoryTitle });
    setMemoryTitle("");
    refresh();
  }

  async function handleDeleteMemory(memoryId: string) {
    await deleteMemory(memoryId);
    refresh();
  }

  async function handleAddLink(event: FormEvent) {
    event.preventDefault();
    if (!linkUrl) return;
    await createExternalLink({
      entityType: "song",
      entityId: id,
      provider: linkProvider,
      url: linkUrl,
    });
    setLinkUrl("");
    refresh();
  }

  async function handleDeleteLink(linkId: string) {
    await deleteExternalLink(linkId);
    refresh();
  }

  async function handleVerifyLink(linkId: string) {
    await verifyExternalLink(linkId);
    refresh();
  }

  async function handleDeleteSong() {
    if (!confirm(`Delete "${song?.title}"?`)) return;
    await deleteSong(id);
    router.push("/songs");
  }

  async function handleGenerateAnalysis(event: FormEvent) {
    event.preventDefault();
    setAnalysisError(null);
    setGenerating(true);
    try {
      await generateSongAnalysis(id, analysisType);
      refresh();
    } catch (err) {
      setAnalysisError(
        err instanceof ApiError
          ? (err.problem.detail ?? err.message)
          : "Failed to generate analysis.",
      );
    } finally {
      setGenerating(false);
    }
  }

  if (authLoading || !me || !song) return null;

  const attachedTagIds = new Set((song.songTags ?? []).map((st) => st.tagId));
  const availableTags = allTags.filter((t) => !attachedTagIds.has(t.id));

  const userData = song.userData?.[0];

  return (
    <AppShell>
      <Hero
        tone={userData?.favorite ? "red" : "green"}
        icon="♪"
        eyebrow="Song"
        title={song.title}
        meta={
          <>
            {song.primaryArtist && (
              <Link href={`/artists/${song.primaryArtist.id}`}>
                {song.primaryArtist.canonicalName}
              </Link>
            )}
            {song.album && (
              <span className="hero-dot">
                <Link href={`/albums/${song.album.id}`}>{song.album.title}</Link>
              </span>
            )}
            {song.releaseYear ? <span className="hero-dot">{song.releaseYear}</span> : null}
            {userData?.favorite ? <Badge tone="danger">♥ favorite</Badge> : null}
            {userData?.rating ? <Badge>{userData.rating}/10</Badge> : null}
          </>
        }
        actions={
          <Button variant="danger" onClick={handleDeleteSong}>
            Delete song
          </Button>
        }
      />

      <div className="section-stack">
        <Card title="My relationship">
          <form onSubmit={handleSaveRelationship}>
            <div className="form-row">
              <label className="field">
                <span className="field-label">Rating (1-10)</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="input"
                />
              </label>
              <label className="field">
                <span className="field-label">Energy (1-10)</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(e.target.value)}
                  className="input"
                />
              </label>
            </div>
            <label className="checkbox-row field">
              <input
                type="checkbox"
                checked={favorite}
                onChange={(e) => setFavorite(e.target.checked)}
              />
              Favorite
            </label>
            <label className="field">
              <span className="field-label">Note</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="textarea"
              />
            </label>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" variant="primary">
              Save
            </Button>
          </form>
        </Card>

        <Card title="Tags">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1rem" }}>
            {(song.songTags ?? []).map((st) => (
              <span key={st.tagId} className="chip">
                {st.tag.name}
                <button className="chip-remove" onClick={() => handleDetachTag(st.tagId)}>
                  ×
                </button>
              </span>
            ))}
            {(song.songTags ?? []).length === 0 && <EmptyState>No tags yet.</EmptyState>}
          </div>
          <form onSubmit={handleAttachTag} className="form-row" style={{ marginBottom: "0.6rem" }}>
            <select
              value={newTagId}
              onChange={(e) => setNewTagId(e.target.value)}
              className="select"
            >
              <option value="">Attach existing tag…</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.category}: {tag.name}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={!newTagId}>
              Attach
            </Button>
          </form>
          <form onSubmit={handleCreateAndAttachTag} className="form-row">
            <input
              placeholder="Or create a new genre tag…"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="input"
            />
            <Button type="submit" disabled={!newTagName}>
              Create + attach
            </Button>
          </form>
        </Card>

        <Card title="Memories">
          <ul className="list">
            {memories.map((memory) => (
              <li key={memory.id} className="list-row">
                <span className="list-row-main">{memory.title}</span>
                <Button variant="danger" size="sm" onClick={() => handleDeleteMemory(memory.id)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
          {memories.length === 0 && <EmptyState>No memories yet.</EmptyState>}
          <form onSubmit={handleAddMemory} className="form-row" style={{ marginTop: 8 }}>
            <input
              placeholder="e.g. First heard at Mo'Fire 2026…"
              value={memoryTitle}
              onChange={(e) => setMemoryTitle(e.target.value)}
              className="input"
            />
            <Button type="submit" disabled={!memoryTitle}>
              Add memory
            </Button>
          </form>
        </Card>

        <Card title="Links">
          <ul className="list">
            {links.map((link) => (
              <li key={link.id} className="list-row">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="list-row-main"
                  style={{ overflowWrap: "anywhere" }}
                >
                  {link.provider}: {link.url}
                </a>
                <span className="list-row-side">
                  <Badge tone={link.verifiedAt ? "success" : "neutral"}>
                    {link.verifiedAt ? "verified" : "unverified"}
                  </Badge>
                  <Button size="sm" onClick={() => handleVerifyLink(link.id)}>
                    Verify
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteLink(link.id)}>
                    Remove
                  </Button>
                </span>
              </li>
            ))}
          </ul>
          {links.length === 0 && <EmptyState>No links yet.</EmptyState>}
          <form onSubmit={handleAddLink} className="form-row" style={{ marginTop: 8 }}>
            <select
              value={linkProvider}
              onChange={(e) => setLinkProvider(e.target.value)}
              className="select"
              style={{ flex: "0 1 160px" }}
            >
              <option value="spotify">Spotify</option>
              <option value="youtube">YouTube</option>
              <option value="bandcamp">Bandcamp</option>
              <option value="soundcloud">SoundCloud</option>
              <option value="website">Website</option>
            </select>
            <input
              type="url"
              placeholder="https://…"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="input"
            />
            <Button type="submit" disabled={!linkUrl}>
              Add
            </Button>
          </form>
        </Card>

        <Card title="AI analyses">
          <ul className="list" style={{ gap: "0.5rem" }}>
            {analyses.map((analysis) => (
              <li
                key={analysis.id}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.7rem 0.85rem",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <strong>{analysis.analysisType}</strong>
                  <Badge
                    tone={
                      analysis.status === "APPROVED"
                        ? "success"
                        : analysis.status === "REJECTED"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {analysis.status}
                  </Badge>
                </div>
                {analysis.summary && (
                  <p style={{ marginTop: "0.4rem", marginBottom: 0 }}>{analysis.summary}</p>
                )}
              </li>
            ))}
          </ul>
          {analyses.length === 0 && <EmptyState>No analyses yet.</EmptyState>}
          <form onSubmit={handleGenerateAnalysis} className="form-row" style={{ marginTop: 8 }}>
            <select
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value as AnalysisType)}
              className="select"
            >
              {ANALYSIS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <Button type="submit" variant="primary" disabled={generating}>
              {generating ? "Analyzing…" : "Generate with AI"}
            </Button>
          </form>
          {analysisError && <Alert>{analysisError}</Alert>}
          <p className="text-faint" style={{ fontSize: 13, marginTop: "0.75rem", marginBottom: 0 }}>
            Generated analyses are drafts — review and approve them in the{" "}
            <Link href="/inbox">AI Inbox</Link> before they&rsquo;re treated as fact.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
