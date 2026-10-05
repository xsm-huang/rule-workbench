import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { SchemesService } from './schemes.service.js';
import { SchemeListQueryDto } from './dto/scheme-list-query.dto.js';
import {
  USER_ROLES,
  type SchemeListResponse,
  type AuthUser,
  type CreateSchemeResult,
  type SchemeDetail,
} from '@rule-workbench/contracts';
import { Roles } from '../common/auth/roles.decorator.js';
import { CreateSchemeDto } from './dto/create-scheme.dto.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import type { RequsetWithId } from '../common/request-id/request-id.middleware.js';

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

  @Get(':id')
  getSchemeDetail(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<SchemeDetail> {
    return this.schemesService.findOne(id, user);
  }
}
