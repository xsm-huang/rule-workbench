import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { SchemesService } from './schemes.service.js';
import { SchemeListQueryDto } from './dto/scheme-list-query.dto.js';
import {
  USER_ROLES,
  type SchemeListResponse,
  type AuthUser,
  type CreateSchemeResult,
  type SchemeDetail,
  type SaveDraftInput,
  type SaveDraftResult,
  COMMON_API_ERROR_CODES,
} from '@rule-workbench/contracts';
import { Roles } from '../common/auth/roles.decorator.js';
import { CreateSchemeDto } from './dto/create-scheme.dto.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import type { RequsetWithId } from '../common/request-id/request-id.middleware.js';
import { SaveSchemeDraftDto } from './dto/save-scheme-draft.dto.js';
import { ApiException } from '../common/request-id/exceptions/api.exceptions.js';
import { flattenValidationErrors } from '../common/request-id/exceptions/validation-errors.js';

@Controller('schemes')
export class SchemesController {
  constructor(private readonly schemesService: SchemesService) {}

  @Get('getSchemeList')
  getSchemesList(
    @Query() query: SchemeListQueryDto,
  ): Promise<SchemeListResponse> {
    return this.schemesService.findAll(query);
  }

  @Post('createSchemeDraft')
  @Roles(USER_ROLES.EDITOR)
  createDraft(
    @Body() input: CreateSchemeDto,
    @CurrentUser() user: AuthUser,
    @Req() request: RequsetWithId,
  ): Promise<CreateSchemeResult> {
    return this.schemesService.createDraft(input, user.id, request.requestId);
  }

  @Put(':id/draft')
  @Roles(USER_ROLES.EDITOR)
  saveDraft(
    @Param('id') id: string,
    // 显式指定保存 DTO，使本接口的校验失败返回 422，其他接口仍使用全局的 400。
    @Body(
      new ValidationPipe({
        expectedType: SaveSchemeDraftDto,
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) =>
          new ApiException({
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            code: COMMON_API_ERROR_CODES.VALIDATION_FAILED,
            message: '请求参数校验失败',
            fieldErrors: flattenValidationErrors(errors),
          }),
      }),
    )
    input: SaveDraftInput,
    @CurrentUser() user: AuthUser,
    @Req() request: RequsetWithId,
  ): Promise<SaveDraftResult> {
    return this.schemesService.saveDraft(id, input, user, request.requestId);
  }

  @Get(':id')
  getSchemeDetail(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<SchemeDetail> {
    return this.schemesService.findOne(id, user);
  }
}
