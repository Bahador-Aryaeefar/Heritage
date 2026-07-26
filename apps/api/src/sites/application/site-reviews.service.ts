import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  MemberReview,
  PaginatedResponse,
  SiteReview,
  UpsertSiteReviewInput,
} from '@heritage/shared-types';
import { normalizePagination, paginatedResponse } from '../../common/pagination/pagination';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SiteReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listBySlug(
    slug: string,
    query: { page?: number; limit?: number },
    viewerUserId?: string,
  ): Promise<PaginatedResponse<SiteReview>> {
    const site = await this.requireActiveSite(slug);
    const pagination = normalizePagination(query);
    const [reviews, totalItems] = await this.prisma.$transaction([
      this.prisma.siteReview.findMany({
        where: { siteId: site.id },
        include: {
          user: { select: { displayName: true } },
          _count: { select: { likes: true } },
          ...(viewerUserId
            ? {
                likes: {
                  where: { userId: viewerUserId },
                  select: { id: true },
                  take: 1,
                },
              }
            : {}),
        },
        orderBy: { updatedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.siteReview.count({ where: { siteId: site.id } }),
    ]);

    return paginatedResponse(
      reviews.map((review) => this.toPublicReview(review, viewerUserId)),
      totalItems,
      pagination,
    );
  }

  async listForMember(
    userId: string,
    locale: string,
    query: { page?: number; limit?: number },
  ): Promise<PaginatedResponse<MemberReview>> {
    const pagination = normalizePagination(query);
    const [reviews, totalItems] = await this.prisma.$transaction([
      this.prisma.siteReview.findMany({
        where: { userId },
        include: {
          site: {
            select: {
              slug: true,
              translations: {
                where: { locale: { in: [locale, 'fa'] } },
                select: { locale: true, title: true },
              },
            },
          },
          _count: { select: { likes: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.siteReview.count({ where: { userId } }),
    ]);

    return paginatedResponse(
      reviews.map((review) => this.toMemberReview(review, locale)),
      totalItems,
      pagination,
    );
  }

  async getForUser(slug: string, userId: string): Promise<SiteReview | null> {
    const site = await this.requireActiveSite(slug);
    const review = await this.prisma.siteReview.findUnique({
      where: { siteId_userId: { siteId: site.id, userId } },
      include: {
        user: { select: { displayName: true } },
        _count: { select: { likes: true } },
        likes: { where: { userId }, select: { id: true }, take: 1 },
      },
    });
    return review ? this.toPublicReview(review, userId) : null;
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
      include: {
        user: { select: { displayName: true } },
        _count: { select: { likes: true } },
        likes: { where: { userId }, select: { id: true }, take: 1 },
      },
    });
    return this.toPublicReview(review, userId);
  }

  async deleteForUser(slug: string, userId: string): Promise<void> {
    const site = await this.requireActiveSite(slug);
    await this.prisma.siteReview.deleteMany({
      where: { siteId: site.id, userId },
    });
  }

  async likeReview(slug: string, reviewId: string, userId: string): Promise<SiteReview> {
    const site = await this.requireActiveSite(slug);
    const review = await this.prisma.siteReview.findFirst({
      where: { id: reviewId, siteId: site.id },
      select: { id: true },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.prisma.siteReviewLike.upsert({
      where: { reviewId_userId: { reviewId, userId } },
      create: { reviewId, userId },
      update: {},
    });

    return this.getReviewById(reviewId, userId);
  }

  async unlikeReview(slug: string, reviewId: string, userId: string): Promise<SiteReview> {
    const site = await this.requireActiveSite(slug);
    const review = await this.prisma.siteReview.findFirst({
      where: { id: reviewId, siteId: site.id },
      select: { id: true },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.prisma.siteReviewLike.deleteMany({
      where: { reviewId, userId },
    });

    return this.getReviewById(reviewId, userId);
  }

  private async getReviewById(reviewId: string, viewerUserId: string): Promise<SiteReview> {
    const review = await this.prisma.siteReview.findUnique({
      where: { id: reviewId },
      include: {
        user: { select: { displayName: true } },
        _count: { select: { likes: true } },
        likes: { where: { userId: viewerUserId }, select: { id: true }, take: 1 },
      },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return this.toPublicReview(review, viewerUserId);
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

  private toPublicReview(
    review: {
      id: string;
      body: string;
      updatedAt: Date;
      user: { displayName: string | null };
      _count: { likes: number };
      likes?: { id: string }[];
    },
    viewerUserId?: string,
  ): SiteReview {
    return {
      id: review.id,
      body: review.body,
      authorName: review.user.displayName?.trim() || 'Member',
      updatedAt: review.updatedAt.toISOString(),
      likeCount: review._count.likes,
      ...(viewerUserId ? { likedByMe: (review.likes?.length ?? 0) > 0 } : {}),
    };
  }

  private toMemberReview(
    review: {
      id: string;
      body: string;
      updatedAt: Date;
      _count: { likes: number };
      site: {
        slug: string;
        translations: { locale: string; title: string }[];
      };
    },
    locale: string,
  ): MemberReview {
    const translation =
      review.site.translations.find((item) => item.locale === locale) ??
      review.site.translations.find((item) => item.locale === 'fa') ??
      review.site.translations[0];

    return {
      id: review.id,
      body: review.body,
      likeCount: review._count.likes,
      updatedAt: review.updatedAt.toISOString(),
      siteSlug: review.site.slug,
      siteTitle: translation?.title ?? review.site.slug,
    };
  }
}
