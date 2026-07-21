import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SITE_CATEGORIES, type SiteCategory } from '@heritage/shared-types';
import { PaginationQueryDto } from '../../common/pagination/pagination';

export class AdminSitesListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SITE_CATEGORIES })
  @IsOptional()
  @IsIn([...SITE_CATEGORIES])
  category?: SiteCategory;

  @ApiPropertyOptional({ description: 'Filter by slug or title (any locale)', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
