import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { createSiteFullSchema, updateSiteFullSchema } from '@heritage/shared-types';
import { AdminSitesService } from '../application/admin-sites.service';
import { PaginationQueryDto } from '../../common/pagination/pagination';
import { AUDIO_MAX_BYTES } from '../../storage/upload-limits';
import { AdminSitesListQueryDto } from './admin-sites-list.query';
import {
  ADMIN_SITE_EXAMPLE,
  ADMIN_SITE_SCHEMA,
  CITY_EXAMPLE,
  CITY_SCHEMA,
  CREATE_SITE_FULL_EXAMPLE,
  UPDATE_SITE_FULL_EXAMPLE,
  ApiJsonCreated,
  ApiJsonOk,
  ApiMultipartSiteBody,
  ApiNoContent,
  ApiPaginatedResponse,
  ApiProtectedErrors,
  ApiResourceNotFound,
  ApiValidationError,
} from '../../common/openapi/openapi';

// Every uploaded file's multipart field name IS its `clientFileKey` — the same
// string the JSON `payload` uses for `cover.clientFileKey` / block
// `clientFileKey` references. No prefix stripping needed on either side.
function indexFiles(files: Express.Multer.File[] = []): Record<string, Express.Multer.File> {
  const map: Record<string, Express.Multer.File> = {};
  for (const file of files) {
    map[file.fieldname] = file;
  }
  return map;
}

function parseJsonPayload(raw: string | undefined): unknown {
  if (!raw) {
    throw new BadRequestException('Missing "payload" field');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new BadRequestException('Invalid JSON in "payload" field');
  }
}

@ApiTags('admin-sites')
@ApiCookieAuth('heritage_access')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminSitesController {
  constructor(private readonly adminSitesService: AdminSitesService) {}

  @Get('sites')
  @ApiPaginatedResponse('List sites, including inactive sites', ADMIN_SITE_SCHEMA, ADMIN_SITE_EXAMPLE)
  @ApiProtectedErrors()
  listSites(@Query() query: AdminSitesListQueryDto) {
    return this.adminSitesService.listSites(query);
  }

  @Get('sites/:id')
  @ApiJsonOk('Get an admin site by ID', ADMIN_SITE_SCHEMA, ADMIN_SITE_EXAMPLE)
  @ApiResourceNotFound('Site')
  @ApiProtectedErrors()
  getSite(@Param('id') id: string) {
    return this.adminSitesService.getSite(id);
  }

  @Post('sites')
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: AUDIO_MAX_BYTES } }))
  @ApiJsonCreated(
    'Create a heritage site with cover, media, and content blocks',
    ADMIN_SITE_SCHEMA,
    ADMIN_SITE_EXAMPLE,
  )
  @ApiMultipartSiteBody(CREATE_SITE_FULL_EXAMPLE)
  @ApiValidationError()
  @ApiProtectedErrors()
  createSiteFull(
    @Body('payload') payloadRaw: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const payload = createSiteFullSchema.parse(parseJsonPayload(payloadRaw));
    return this.adminSitesService.createSiteFull(payload, indexFiles(files));
  }

  @Put('sites/:id')
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: AUDIO_MAX_BYTES } }))
  @ApiJsonOk(
    'Replace a heritage site (slug is immutable): metadata, cover, media, and content blocks',
    ADMIN_SITE_SCHEMA,
    ADMIN_SITE_EXAMPLE,
  )
  @ApiMultipartSiteBody(UPDATE_SITE_FULL_EXAMPLE)
  @ApiValidationError()
  @ApiResourceNotFound('Site')
  @ApiProtectedErrors()
  replaceSiteFull(
    @Param('id') id: string,
    @Body('payload') payloadRaw: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const payload = updateSiteFullSchema.parse(parseJsonPayload(payloadRaw));
    return this.adminSitesService.replaceSiteFull(id, payload, indexFiles(files));
  }

  @Delete('sites/:id')
  @HttpCode(204)
  @ApiNoContent('Delete a heritage site and all of its media')
  @ApiResourceNotFound('Site')
  @ApiProtectedErrors()
  deleteSite(@Param('id') id: string) {
    return this.adminSitesService.deleteSite(id);
  }

  @Get('cities')
  @ApiPaginatedResponse('List cities for the site editor', CITY_SCHEMA, CITY_EXAMPLE)
  @ApiProtectedErrors()
  listCities(@Query() query: PaginationQueryDto) {
    return this.adminSitesService.listCities(query);
  }
}
