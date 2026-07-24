import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResponse, SiteReview, UpsertSiteReviewInput } from '@heritage/shared-types';
import { normalizePagination, paginatedResponse } from '../../common/pagination/pagination';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SiteReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listBySlug(
    slug: string,
    query: { page?: number; limit?: number },
  ): Promise<PaginatedResponse<SiteReview>> {
    const site = await this.requireActiveSite(slug);
    const pagination = normalizePagination(query);
    const [reviews, totalItems] = await this.prisma.$transaction([
      this.prisma.siteReview.findMany({
        where: { siteId: site.id },
        include: { user: { select: { displayName: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.siteReview.count({ where: { siteId: site.id } }),
    ]);

    return paginatedResponse(
      reviews.map((review) => this.toPublicReview(review)),
      totalItems,
      pagination,
    );
  }

  async getForUser(slug: string, userId: string): Promise<SiteReview | null> {
    const site = await this.requireActiveSite(slug);
    const review = await this.prisma.siteReview.findUnique({
      where: { siteId_userId: { siteId: site.id, userId } },
      include: { user: { select: { displayName: true } } },
    });
    return review ? this.toPublicReview(review) : null;
  }

  async upsertForUser(
    slug: string,
    userId: string,
    input: UpsertSiteReviewInput,
  ): Promise<SiteReview> {
    const site = await this.requireActiveSite(slug);
    const review = await this.prisma.siteReview.upsert({
      where: { siteId_userId: { siteId: site.id, userId } },
      create: { siteId: site.id, userId, body: input.body },
      update: { body: input.body },
      include: { user: { select: { displayName: true } } },
    });
    return this.toPublicReview(review);
  }

  async deleteForUser(slug: string, userId: string): Promise<void> {
    const site = await this.requireActiveSite(slug);
    await this.prisma.siteReview.deleteMany({
      where: { siteId: site.id, userId },
    });
  }

  private async requireActiveSite(slug: string) {
    const site = await this.prisma.site.findFirst({
      where: { slug, isActive: true },
      select: { id: true },
    });
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    return site;
  }

  private toPublicReview(review: {
    id: string;
    body: string;
    updatedAt: Date;
    user: { displayName: string | null };
  }): SiteReview {
    return {
      id: review.id,
      body: review.body,
      authorName: review.user.displayName?.trim() || 'Member',
      updatedAt: review.updatedAt.toISOString(),
    };
  }
}
