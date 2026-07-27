import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { normalizeName } from "@resonance/domain";
import type { AnalyzeImportInput } from "@resonance/domain";
import type { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/guards/auth.guard";
import { mapCsvRows, type CsvSongRow } from "./csv";

interface RowPreview {
  rowIndex: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duplicate: boolean;
}

interface AnalysisSummary {
  totalRows: number;
  validRows: number;
  errors: { rowIndex: number; message: string }[];
  preview: RowPreview[];
  rows: CsvSongRow[];
}

interface CommitSummary extends AnalysisSummary {
  committed: true;
  songsCreated: number;
  duplicatesSkipped: number;
  commitErrors: { rowIndex: number; message: string }[];
}

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async analyze(input: AnalyzeImportInput, user: AuthenticatedUser) {
    const { rows, errors } = mapCsvRows(input.csvContent);

    const preview: RowPreview[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const artist = await this.prisma.artist.findFirst({
        where: { normalizedName: normalizeName(row.artistName), deletedAt: null },
      });
      let duplicate = false;
      if (artist) {
        const existingSong = await this.prisma.song.findFirst({
          where: {
            primaryArtistId: artist.id,
            normalizedTitle: normalizeName(row.trackName),
            deletedAt: null,
          },
        });
        duplicate = Boolean(existingSong);
      }
      preview.push({
        rowIndex: i,
        trackName: row.trackName,
        artistName: row.artistName,
        albumName: row.albumName,
        duplicate,
      });
    }

    const summary: AnalysisSummary = {
      totalRows: rows.length + errors.length,
      validRows: rows.length,
      errors,
      preview,
      rows,
    };

    const job = await this.prisma.importJob.create({
      data: {
        userId: user.userId,
        sourceType: "csv",
        filename: input.filename,
        status: "ANALYZED",
        summaryJson: summary as unknown as Prisma.InputJsonValue,
      },
    });

    return job;
  }

  async findOne(id: string) {
    const job = await this.prisma.importJob.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Import job ${id} not found.`);
    }
    return job;
  }

  async commit(id: string, user: AuthenticatedUser) {
    const job = await this.findOne(id);
    if (job.status === "COMMITTED") {
      throw new BadRequestException(`Import job ${id} was already committed.`);
    }

    const summary = job.summaryJson as unknown as AnalysisSummary;

    const result = await this.prisma.$transaction(
      async (tx) => {
        let songsCreated = 0;
        let duplicatesSkipped = 0;
        const commitErrors: { rowIndex: number; message: string }[] = [];

        for (let i = 0; i < summary.rows.length; i++) {
          const row = summary.rows[i];
          try {
            const normalizedArtist = normalizeName(row.artistName);
            const existingArtist = await tx.artist.findFirst({
              where: { normalizedName: normalizedArtist, deletedAt: null },
            });
            const artist =
              existingArtist ??
              (await tx.artist.create({
                data: { canonicalName: row.artistName, normalizedName: normalizedArtist },
              }));

            let albumId: string | undefined;
            if (row.albumName) {
              const normalizedAlbum = normalizeName(row.albumName);
              const existingAlbum = await tx.album.findFirst({
                where: { artistId: artist.id, normalizedTitle: normalizedAlbum, deletedAt: null },
              });
              albumId = existingAlbum
                ? existingAlbum.id
                : (
                    await tx.album.create({
                      data: {
                        artistId: artist.id,
                        title: row.albumName,
                        normalizedTitle: normalizedAlbum,
                      },
                    })
                  ).id;
            }

            const normalizedTitle = normalizeName(row.trackName);
            const existingSong = await tx.song.findFirst({
              where: { primaryArtistId: artist.id, normalizedTitle, deletedAt: null },
            });
            if (existingSong) {
              duplicatesSkipped++;
              continue;
            }

            const song = await tx.song.create({
              data: {
                title: row.trackName,
                normalizedTitle,
                primaryArtistId: artist.id,
                albumId,
                releaseYear: row.releaseYear,
                releasePrecision: row.releaseYear ? "YEAR" : undefined,
              },
            });

            if (row.rating || row.favorite || row.note || row.dateAdded) {
              await tx.songUserData.create({
                data: {
                  userId: user.userId,
                  songId: song.id,
                  rating: row.rating,
                  favorite: row.favorite ?? false,
                  userNote: row.note,
                  discoveredAt: row.dateAdded ? new Date(row.dateAdded) : undefined,
                  discoverySource: "csv_import",
                },
              });
            }

            if (row.spotifyUrl) {
              await tx.externalLink.create({
                data: {
                  entityType: "song",
                  entityId: song.id,
                  provider: "spotify",
                  url: row.spotifyUrl,
                },
              });
            }

            for (const tagName of row.tags ?? []) {
              const normalizedTagName = normalizeName(tagName);
              const tag = await tx.tag.upsert({
                where: {
                  normalizedName_category: { normalizedName: normalizedTagName, category: "GENRE" },
                },
                update: {},
                create: { name: tagName, normalizedName: normalizedTagName, category: "GENRE" },
              });
              await tx.songTag.upsert({
                where: { songId_tagId: { songId: song.id, tagId: tag.id } },
                update: {},
                create: {
                  songId: song.id,
                  tagId: tag.id,
                  source: "IMPORT",
                  approvedAt: new Date(),
                },
              });
            }

            await this.audit.record({
              userId: user.userId,
              actorType: "IMPORT",
              actorId: job.id,
              action: "create",
              entityType: "song",
              entityId: song.id,
              afterJson: song,
            });

            songsCreated++;
          } catch (error) {
            commitErrors.push({
              rowIndex: i,
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        const updatedSummary: CommitSummary = {
          ...summary,
          committed: true,
          songsCreated,
          duplicatesSkipped,
          commitErrors,
        };

        return tx.importJob.update({
          where: { id: job.id },
          data: {
            status: "COMMITTED",
            committedAt: new Date(),
            summaryJson: updatedSummary as unknown as Prisma.InputJsonValue,
          },
        });
      },
      { timeout: 60_000 },
    );

    return result;
  }
}
