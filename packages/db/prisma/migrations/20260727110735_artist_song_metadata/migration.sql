-- CreateEnum
CREATE TYPE "ArtistType" AS ENUM ('PERSON', 'GROUP', 'OTHER');

-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "artist_type" "ArtistType",
ADD COLUMN     "begin_date" TEXT,
ADD COLUMN     "end_date" TEXT,
ADD COLUMN     "origin_city" TEXT,
ADD COLUMN     "website_url" TEXT;

-- AlterTable
ALTER TABLE "songs" ADD COLUMN     "bpm" INTEGER,
ADD COLUMN     "label" TEXT,
ADD COLUMN     "musical_key" TEXT;

-- CreateTable
CREATE TABLE "artist_tags" (
    "artist_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "source" "TagSource" NOT NULL DEFAULT 'USER',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_tags_pkey" PRIMARY KEY ("artist_id","tag_id")
);

-- CreateIndex
CREATE INDEX "artist_tags_tag_id_idx" ON "artist_tags"("tag_id");

-- AddForeignKey
ALTER TABLE "artist_tags" ADD CONSTRAINT "artist_tags_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_tags" ADD CONSTRAINT "artist_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
