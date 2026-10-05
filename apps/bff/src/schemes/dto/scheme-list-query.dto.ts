import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PRICING_MODES,
  SCHEME_STATUSES,
  type PricingMode,
  type SchemeStatus,
} from '@rule-workbench/contracts';

export class SchemeListQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(SCHEME_STATUSES)
  status?: SchemeStatus;

  @IsOptional()
  @IsEnum(PRICING_MODES)
  pricingMode?: PricingMode;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsDateString()
  updatedFrom?: string;

  @IsOptional()
  @IsDateString()
  updatedTo?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 10;

  @IsIn(['updatedAt:desc', 'updatedAt:asc'])
  sort: 'updatedAt:desc' | 'updatedAt:asc' = 'updatedAt:desc';
}
