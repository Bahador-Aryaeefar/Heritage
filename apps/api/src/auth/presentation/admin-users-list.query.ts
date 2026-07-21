import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination';

export class AdminUsersListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by phone or display name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
