-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'AI', 'IMPORT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TagCategory" AS ENUM ('GENRE', 'THEME', 'MOOD', 'DANCE', 'USAGE', 'LANGUAGE');

-- CreateEnum
CREATE TYPE "TagSource" AS ENUM ('USER', 'AI', 'IMPORT', 'PROVIDER');

-- CreateEnum
CREATE TYPE "SongStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'WANT_TO_LISTEN');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'ANALYZED', 'COMMITTING', 'COMMITTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReleaseType" AS ENUM ('SINGLE', 'EP', 'ALBUM', 'COMPILATION');

-- CreateEnum
CREATE TYPE "ReleasePrecision" AS ENUM ('YEAR', 'MONTH', 'DAY');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'cs',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Prague',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "canonical_name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "country_code" CHAR(2),
    "description" TEXT,
    "musicbrainz_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "albums" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "artist_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "normalized_title" TEXT NOT NULL,
    "release_type" "ReleaseType",
    "release_year" INTEGER,
    "release_month" INTEGER,
    "release_day" INTEGER,
    "release_precision" "ReleasePrecision",
    "cover_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "songs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "primary_artist_id" UUID NOT NULL,
    "album_id" UUID,
    "title" TEXT NOT NULL,
    "normalized_title" TEXT NOT NULL,
    "release_year" INTEGER,
    "release_month" INTEGER,
    "release_day" INTEGER,
    "release_precision" "ReleasePrecision",
    "duration_ms" INTEGER,
    "language_code" TEXT,
    "isrc" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song_artists" (
    "song_id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'featured',

    CONSTRAINT "song_artists_pkey" PRIMARY KEY ("song_id","artist_id","role")
);

-- CreateTable
CREATE TABLE "song_user_data" (
    "user_id" UUID NOT NULL,
    "song_id" UUID NOT NULL,
    "rating" INTEGER,
    "energy_level" INTEGER,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "status" "SongStatus" NOT NULL DEFAULT 'ACTIVE',
    "user_note" TEXT,
    "discovered_at" TIMESTAMPTZ,
    "discovery_source" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "song_user_data_pkey" PRIMARY KEY ("user_id","song_id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "category" "TagCategory" NOT NULL,
    "description" TEXT,
    "system_managed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song_tags" (
    "song_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "source" "TagSource" NOT NULL DEFAULT 'USER',
    "confidence" DOUBLE PRECISION,
    "approved_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_tags_pkey" PRIMARY KEY ("song_id","tag_id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "actor_type" "ActorType" NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "request_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "source_type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "summary_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committed_at" TIMESTAMPTZ,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "artists_normalized_name_idx" ON "artists"("normalized_name");

-- CreateIndex
CREATE INDEX "albums_artist_id_idx" ON "albums"("artist_id");

-- CreateIndex
CREATE INDEX "albums_normalized_title_idx" ON "albums"("normalized_title");

-- CreateIndex
CREATE INDEX "songs_primary_artist_id_idx" ON "songs"("primary_artist_id");

-- CreateIndex
CREATE INDEX "songs_album_id_idx" ON "songs"("album_id");

-- CreateIndex
CREATE INDEX "songs_normalized_title_idx" ON "songs"("normalized_title");

-- CreateIndex
CREATE INDEX "song_artists_artist_id_idx" ON "song_artists"("artist_id");

-- CreateIndex
CREATE INDEX "song_user_data_song_id_idx" ON "song_user_data"("song_id");

-- CreateIndex
CREATE INDEX "tags_normalized_name_idx" ON "tags"("normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_normalized_name_category_key" ON "tags"("normalized_name", "category");

-- CreateIndex
CREATE INDEX "song_tags_tag_id_idx" ON "song_tags"("tag_id");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_idx" ON "audit_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");

-- CreateIndex
CREATE INDEX "import_jobs_user_id_idx" ON "import_jobs"("user_id");

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "songs" ADD CONSTRAINT "songs_primary_artist_id_fkey" FOREIGN KEY ("primary_artist_id") REFERENCES "artists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "songs" ADD CONSTRAINT "songs_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_artists" ADD CONSTRAINT "song_artists_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_artists" ADD CONSTRAINT "song_artists_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_user_data" ADD CONSTRAINT "song_user_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_user_data" ADD CONSTRAINT "song_user_data_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_tags" ADD CONSTRAINT "song_tags_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_tags" ADD CONSTRAINT "song_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
