import type { SaveDraftInput } from '@rule-workbench/contracts';
import { IsInt, Min } from 'class-validator';
import { CreateSchemeDto } from './create-scheme.dto.js';

/** 复用草稿基本信息校验；规则内容仍由服务层做结构校验。 */
export class SaveSchemeDraftDto
  extends CreateSchemeDto
  implements Omit<SaveDraftInput, 'content'>
{
  @IsInt({ message: '编辑版本号必须是整数' })
  @Min(1, { message: '编辑版本号不能小于 1' })
  baseVersion: number;
}
