-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "image_data" BYTEA,
ADD COLUMN     "image_mime_type" TEXT;

-- AlterTable
ALTER TABLE "artists" ADD COLUMN     "image_data" BYTEA,
ADD COLUMN     "image_mime_type" TEXT;

-- AlterTable
ALTER TABLE "songs" ADD COLUMN     "image_data" BYTEA,
ADD COLUMN     "image_mime_type" TEXT;
