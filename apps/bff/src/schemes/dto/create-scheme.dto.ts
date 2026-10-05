import type { PricingMode } from '@rule-workbench/contracts';
import { CreateSchemeInput, PRICING_MODES } from '@rule-workbench/contracts';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSchemeDto implements Omit<CreateSchemeInput, 'content'> {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  scope: string;

  @IsEnum(PRICING_MODES)
  pricingMode: PricingMode;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '方案生效日期格式应为 YYYY-MM-DD',
  })
  @IsDateString({ strict: true }, { message: '请选择有效的方案生效日期' })
  effectiveDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  // 只验证外层
  @IsObject()
  content: unknown;
}
