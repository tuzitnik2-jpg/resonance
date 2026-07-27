-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "label" TEXT;

-- AlterTable
ALTER TABLE "playlists" ADD COLUMN     "rules_json" JSONB;

-- CreateTable
CREATE TABLE "album_tags" (
    "album_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "source" "TagSource" NOT NULL DEFAULT 'USER',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "album_tags_pkey" PRIMARY KEY ("album_id","tag_id")
);

-- CreateIndex
CREATE INDEX "album_tags_tag_id_idx" ON "album_tags"("tag_id");

-- AddForeignKey
ALTER TABLE "album_tags" ADD CONSTRAINT "album_tags_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_tags" ADD CONSTRAINT "album_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
