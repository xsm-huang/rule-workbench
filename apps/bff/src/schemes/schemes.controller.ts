import { Controller, Get, Query } from '@nestjs/common';
import { SchemesService } from './schemes.service.js';
import { SchemeListResponseDto } from './dto/scheme-list.dto.js';
import { SchemeListQueryDto } from './dto/scheme-list-query.dto.js';

@Controller('schemes')
export class SchemesController {
  constructor(private readonly schemesService: SchemesService) {}

  @Get()
  getSchemesList(
    @Query() query: SchemeListQueryDto,
  ): Promise<SchemeListResponseDto> {
    return this.schemesService.findAll(query);
  }
}
