import { Controller, Get, Query } from '@nestjs/common';
import { SchemesService } from './schemes.service.js';
import { SchemeListQueryDto } from './dto/scheme-list-query.dto.js';
import type { SchemeListResponse } from '@rule-workbench/contracts';

@Controller('schemes')
export class SchemesController {
  constructor(private readonly schemesService: SchemesService) {}

  @Get()
  getSchemesList(
    @Query() query: SchemeListQueryDto,
  ): Promise<SchemeListResponse> {
    return this.schemesService.findAll(query);
  }
}
