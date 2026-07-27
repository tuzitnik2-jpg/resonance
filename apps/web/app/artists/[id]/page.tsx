"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { Alert, AppShell, Button, Card, EmptyState, Hero } from "@/components/ui";
import { ImageUploader } from "@/components/image-uploader";
import {
  ApiError,
  attachArtistTag,
  createTag,
  deleteArtist,
  detachArtistTag,
  enrichArtistFromMusicBrainz,
  getArtist,
  listAlbums,
  listSongs,
  listTags,
  updateArtist,
  type Album,
  type Artist,
  type ArtistType,
  type Song,
  type Tag,
} from "@/lib/api-client";

const ARTIST_TYPE_LABELS: Record<ArtistType, string> = {
  PERSON: "Person",
  GROUP: "Group",
  OTHER: "Other",
};

export default function ArtistDetailPage() {
  const { me, loading: authLoading } = useCurrentUser();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [artistType, setArtistType] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [beginDate, setBeginDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [newTagId, setNewTagId] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichMessage, setEnrichMessage] = useState<string | null>(null);
  const [imageVersion, setImageVersion] = useState(0);

  function refresh() {
    getArtist(id).then((a) => {
      setArtist(a);
      setName(a.canonicalName);
      setCountryCode(a.countryCode ?? "");
      setArtistType(a.artistType ?? "");
      setOriginCity(a.originCity ?? "");
      setBeginDate(a.beginDate ?? "");
      setEndDate(a.endDate ?? "");
      setWebsiteUrl(a.websiteUrl ?? "");
      setDescription(a.description ?? "");
    });
  }

  useEffect(() => {
    if (!me) return;
    refresh();
    listSongs({ artistId: id }).then((page) => setSongs(page.items));
    listAlbums({ artistId: id }).then((page) => setAlbums(page.items));
    listTags().then((page) => setAllTags(page.items));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, id]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateArtist(id, {
        canonicalName: name,
        countryCode: countryCode || null,
        artistType: (artistType || null) as ArtistType | null,
        originCity: originCity || null,
        beginDate: beginDate || null,
        endDate: endDate || null,
        websiteUrl: websiteUrl || null,
        description: description || null,
      });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? (err.problem.detail ?? err.message) : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAttachTag(event: FormEvent) {
    event.preventDefault();
    if (!newTagId) return;
    await attachArtistTag(id, newTagId);
    setNewTagId("");
    refresh();
  }

  async function handleCreateAndAttachTag(event: FormEvent) {
    event.preventDefault();
    if (!newTagName) return;
    const tag = await createTag({ name: newTagName, category: "GENRE" });
    await attachArtistTag(id, tag.id);
    setNewTagName("");
    listTags().then((page) => setAllTags(page.items));
    refresh();
  }

  async function handleDetachTag(tagId: string) {
    await detachArtistTag(id, tagId);
    refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete artist "${artist?.canonicalName}"? This cannot be undone from the UI.`))
      return;
    await deleteArtist(id);
    router.push("/artists");
  }

  async function handleEnrich() {
    setEnriching(true);
    setEnrichMessage(null);
    try {
      const result = await enrichArtistFromMusicBrainz(id);
      if (result.attached && result.artist) {
        setArtist(result.artist);
        setEnrichMessage(`Linked to MusicBrainz (${result.artist.musicbrainzId}).`);
      } else {
        setEnrichMessage(
          result.candidates.length > 0
            ? `No confident match. Closest: ${result.candidates[0].name} (score ${result.candidates[0].score}).`
            : "No MusicBrainz match found.",
        );
      }
    } catch {
      setEnrichMessage("MusicBrainz lookup failed.");
    } finally {
      setEnriching(false);
    }
  }

  if (authLoading || !me || !artist) return null;

  const attachedTagIds = new Set((artist.artistTags ?? []).map((at) => at.tagId));
  const availableTags = allTags.filter((t) => !attachedTagIds.has(t.id));

  const origin = [artist.originCity, artist.countryCode].filter(Boolean).join(", ");
  const lifespan = artist.beginDate
    ? artist.endDate
      ? `${artist.beginDate} – ${artist.endDate}`
      : artist.beginDate
    : null;

  return (
    <AppShell>
      <Hero
        tone="gold"
        icon="◈"
        eyebrow="Artist"
        title={artist.canonicalName}
        round
        image={{ type: "artist", id, version: imageVersion }}
        meta={
          <>
            {artist.artistType ? <span>{ARTIST_TYPE_LABELS[artist.artistType]}</span> : null}
            {origin ? <span className="hero-dot">{origin}</span> : null}
            {lifespan ? <span className="hero-dot">{lifespan}</span> : null}
            {artist.websiteUrl ? (
              <span className="hero-dot">
                <a href={artist.websiteUrl} target="_blank" rel="noreferrer">
                  Website
                </a>
              </span>
            ) : null}
            {artist.musicbrainzId ? (
              <span className="hero-dot">
                <a
                  href={`https://musicbrainz.org/artist/${artist.musicbrainzId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  MusicBrainz
                </a>
              </span>
            ) : null}
          </>
        }
        actions={
          <Button variant="danger" onClick={handleDelete}>
            Delete artist
          </Button>
        }
      />

      <div className="section-stack">
        <Card title="Artwork">
          <ImageUploader
            type="artist"
            id={id}
            version={imageVersion}
            onChange={() => setImageVersion((v) => v + 1)}
            suggestArtist={artist.canonicalName}
          />
        </Card>

        <Card title="Details">
          <form onSubmit={handleSave}>
            <label className="field">
              <span className="field-label">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
            </label>
            <div className="form-row">
              <label className="field">
                <span className="field-label">Type</span>
                <select
                  value={artistType}
                  onChange={(e) => setArtistType(e.target.value)}
                  className="select"
                >
                  <option value="">—</option>
                  <option value="PERSON">Person</option>
                  <option value="GROUP">Group</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Country code</span>
                <input
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="input"
                />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Origin city</span>
              <input
                value={originCity}
                onChange={(e) => setOriginCity(e.target.value)}
                className="input"
              />
            </label>
            <div className="form-row">
              <label className="field">
                <span className="field-label">Born / formed</span>
                <input
                  value={beginDate}
                  onChange={(e) => setBeginDate(e.target.value)}
                  placeholder="e.g. 1945 or 1945-02-06"
                  className="input"
                />
              </label>
              <label className="field">
                <span className="field-label">Died / disbanded</span>
                <input
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="e.g. 1981 or 1981-05-11"
                  className="input"
                />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Website</span>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://…"
                className="input"
              />
            </label>
            <label className="field">
              <span className="field-label">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="textarea"
              />
            </label>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </form>
        </Card>

        <Card title="Tags">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1rem" }}>
            {(artist.artistTags ?? []).map((at) => (
              <span key={at.tagId} className="chip">
                {at.tag.name}
                <button className="chip-remove" onClick={() => handleDetachTag(at.tagId)}>
                  ×
                </button>
              </span>
            ))}
            {(artist.artistTags ?? []).length === 0 && <EmptyState>No tags yet.</EmptyState>}
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

        <Card title="MusicBrainz">
          {artist.musicbrainzId ? (
            <p>
              Linked:{" "}
              <a
                href={`https://musicbrainz.org/artist/${artist.musicbrainzId}`}
                target="_blank"
                rel="noreferrer"
              >
                {artist.musicbrainzId}
              </a>
            </p>
          ) : (
            <Button onClick={handleEnrich} disabled={enriching}>
              {enriching ? "Looking up…" : "Look up on MusicBrainz"}
            </Button>
          )}
          {enrichMessage && <p className="text-muted">{enrichMessage}</p>}
        </Card>

        <Card title="Albums">
          <ul className="list">
            {albums.map((album) => (
              <li key={album.id} className="list-row">
                <Link href={`/albums/${album.id}`} className="list-row-main">
                  <div className="list-row-title">{album.title}</div>
                </Link>
                {album.releaseYear ? (
                  <span className="list-row-side">{album.releaseYear}</span>
                ) : null}
              </li>
            ))}
          </ul>
          {albums.length === 0 && <EmptyState>No albums yet.</EmptyState>}
        </Card>

        <Card title="Songs">
          <ul className="list">
            {songs.map((song) => (
              <li key={song.id} className="list-row">
                <Link href={`/songs/${song.id}`} className="list-row-main">
                  <div className="list-row-title">{song.title}</div>
                </Link>
              </li>
            ))}
          </ul>
          {songs.length === 0 && <EmptyState>No songs yet.</EmptyState>}
        </Card>
      </div>
    </AppShell>
  );
}
