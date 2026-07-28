import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { LandingResponse, SiteDetail } from '@heritage/shared-types';
import { upsertSiteReviewSchema } from '@heritage/shared-types';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/roles.decorator';
import { QrService } from '../../qr/application/qr.service';
import { SiteReviewsService } from '../application/site-reviews.service';
import { SitesService } from '../application/sites.service';
import { PaginationQueryDto } from '../../common/pagination/pagination';
import {
  SITE_CARD_EXAMPLE,
  SITE_CARD_SCHEMA,
  SITE_DETAIL_EXAMPLE,
  SITE_DETAIL_SCHEMA,
  SITE_REVIEW_EXAMPLE,
  SITE_REVIEW_SCHEMA,
  ApiJsonBody,
  ApiJsonOk,
  ApiNoContent,
  ApiPaginatedResponse,
  ApiProtectedErrors,
  ApiResourceNotFound,
  ApiValidationError,
} from '../../common/openapi/openapi';

@ApiTags('public')
@Controller('public/landing')
export class PublicLandingController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  @ApiPaginatedResponse('List active public heritage sites', SITE_CARD_SCHEMA, SITE_CARD_EXAMPLE)
  getLanding(@Query() query: PaginationQueryDto): Promise<LandingResponse> {
    return this.sitesService.getLanding(query);
  }
}

@ApiTags('public')
@Controller('public/sites')
export class PublicSitesController {
  constructor(
    private readonly sitesService: SitesService,
    private readonly qrService: QrService,
    private readonly siteReviewsService: SiteReviewsService,
  ) {}

  @Get(':slug/qr.png')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Download a printable QR plaque PNG' })
  @ApiProduces('image/png')
  @ApiOkResponse({
    description: 'PNG image bytes.',
    content: { 'image/png': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiResourceNotFound('Site')
  async getQrPng(@Param('slug') slug: string, @Res() res: Response): Promise<void> {
    const png = await this.qrService.generateSiteQrPng(slug);
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${slug}-plaque.png"`,
      'Cache-Control': 'public, max-age=3600',
    });
    res.send(png);
  }

  @Get(':slug/reviews')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiPaginatedResponse('List public reviews for a site', SITE_REVIEW_SCHEMA, SITE_REVIEW_EXAMPLE)
  @ApiResourceNotFound('Site')
  listReviews(
    @Param('slug') slug: string,
    @Query() query: PaginationQueryDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    const viewerUserId = req.user?.role === 'MEMBER' ? req.user.id : undefined;
    return this.siteReviewsService.listBySlug(slug, query, viewerUserId);
  }

  @Get(':slug/reviews/me')
  @UseGuards(JwtAuthGuard)
  @ApiJsonOk('Get the current user review for a site', SITE_REVIEW_SCHEMA, SITE_REVIEW_EXAMPLE)
  @ApiProtectedErrors()
  @ApiResourceNotFound('Site')
  async getMyReview(
    @Param('slug') slug: string,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    const review = await this.siteReviewsService.getForUser(slug, req.user.id);
    return review ?? null;
  }

  @Put(':slug/reviews/me')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @ApiJsonOk('Create or update the current user review', SITE_REVIEW_SCHEMA, SITE_REVIEW_EXAMPLE)
  @ApiJsonBody(
    {
      type: 'object',
      required: ['body'],
      properties: { body: { type: 'string', example: 'Beautiful place with rich history.' } },
    },
    { body: 'Beautiful place with rich history.' },
  )
  @ApiValidationError()
  @ApiProtectedErrors()
  @ApiResourceNotFound('Site')
  upsertMyReview(
    @Param('slug') slug: string,
    @Body() body: unknown,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    const input = upsertSiteReviewSchema.parse(body);
    return this.siteReviewsService.upsertForUser(slug, req.user.id, input);
  }

  @Delete(':slug/reviews/me')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiNoContent('Delete the current user review for a site')
  @ApiProtectedErrors()
  @ApiResourceNotFound('Site')
  async deleteMyReview(
    @Param('slug') slug: string,
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<void> {
    await this.siteReviewsService.deleteForUser(slug, req.user.id);
  }

  @Post(':slug/reviews/:reviewId/like')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @ApiJsonOk('Like a site review', SITE_REVIEW_SCHEMA, SITE_REVIEW_EXAMPLE)
  @ApiProtectedErrors()
  @ApiResourceNotFound('Site')
  likeReview(
    @Param('slug') slug: string,
    @Param('reviewId') reviewId: string,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.siteReviewsService.likeReview(slug, reviewId, req.user.id);
  }

  @Delete(':slug/reviews/:reviewId/like')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @ApiJsonOk('Remove a like from a site review', SITE_REVIEW_SCHEMA, SITE_REVIEW_EXAMPLE)
  @ApiProtectedErrors()
  @ApiResourceNotFound('Site')
  unlikeReview(
    @Param('slug') slug: string,
    @Param('reviewId') reviewId: string,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.siteReviewsService.unlikeReview(slug, reviewId, req.user.id);
  }

  @Get(':slug')
  @ApiJsonOk('Get a public heritage site by slug', SITE_DETAIL_SCHEMA, SITE_DETAIL_EXAMPLE)
  @ApiResourceNotFound('Site')
  getBySlug(@Param('slug') slug: string): Promise<SiteDetail> {
    return this.sitesService.getPublicSiteBySlug(slug);
  }
}
