-- CreateEnum
CREATE TYPE "MemoryVisibility" AS ENUM ('PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "AnalysisType" AS ENUM ('MEANING', 'STYLE', 'MOOD_ENERGY', 'DANCE', 'REELS', 'FESTIVAL', 'COLLECTION');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ConversationChannel" AS ENUM ('CHATGPT', 'WEB');

-- CreateEnum
CREATE TYPE "ConversationRole" AS ENUM ('USER', 'ASSISTANT', 'TOOL');

-- CreateTable
CREATE TABLE "memories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "occurred_on" DATE,
    "location" TEXT,
    "visibility" "MemoryVisibility" NOT NULL DEFAULT 'PRIVATE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "festivals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country_code" CHAR(2),
    "start_date" DATE,
    "end_date" DATE,
    "website_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "festivals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "festival_performances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "festival_id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "stage" TEXT,
    "starts_at" TIMESTAMPTZ,
    "ends_at" TIMESTAMPTZ,
    "priority" INTEGER,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "festival_performances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'collection',
    "description" TEXT,
    "external_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlist_items" (
    "playlist_id" UUID NOT NULL,
    "song_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "reason" TEXT,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlist_items_pkey" PRIMARY KEY ("playlist_id","song_id")
);

-- CreateTable
CREATE TABLE "external_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "provider_id" TEXT,
    "verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song_analyses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "song_id" UUID NOT NULL,
    "analysis_type" "AnalysisType" NOT NULL,
    "content_json" JSONB NOT NULL,
    "summary" TEXT,
    "source" "TagSource" NOT NULL DEFAULT 'AI',
    "model" TEXT,
    "prompt_version" TEXT,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "song_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "instructions" TEXT NOT NULL,
    "schema_json" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT,
    "channel" "ConversationChannel" NOT NULL DEFAULT 'WEB',
    "external_conversation_ref" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "role" "ConversationRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tool_calls_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "memories_user_id_idx" ON "memories"("user_id");

-- CreateIndex
CREATE INDEX "memories_entity_type_entity_id_idx" ON "memories"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "festival_performances_artist_id_idx" ON "festival_performances"("artist_id");

-- CreateIndex
CREATE UNIQUE INDEX "festival_performances_festival_id_artist_id_stage_key" ON "festival_performances"("festival_id", "artist_id", "stage");

-- CreateIndex
CREATE INDEX "playlists_user_id_idx" ON "playlists"("user_id");

-- CreateIndex
CREATE INDEX "playlist_items_song_id_idx" ON "playlist_items"("song_id");

-- CreateIndex
CREATE INDEX "external_links_entity_type_entity_id_idx" ON "external_links"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "song_analyses_song_id_idx" ON "song_analyses"("song_id");

-- CreateIndex
CREATE INDEX "song_analyses_status_idx" ON "song_analyses"("status");

-- CreateIndex
CREATE INDEX "prompt_versions_name_active_idx" ON "prompt_versions"("name", "active");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_versions_name_version_key" ON "prompt_versions"("name", "version");

-- CreateIndex
CREATE INDEX "conversations_user_id_idx" ON "conversations"("user_id");

-- CreateIndex
CREATE INDEX "conversation_messages_conversation_id_idx" ON "conversation_messages"("conversation_id");

-- AddForeignKey
ALTER TABLE "memories" ADD CONSTRAINT "memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festival_performances" ADD CONSTRAINT "festival_performances_festival_id_fkey" FOREIGN KEY ("festival_id") REFERENCES "festivals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festival_performances" ADD CONSTRAINT "festival_performances_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "playlists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_analyses" ADD CONSTRAINT "song_analyses_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
