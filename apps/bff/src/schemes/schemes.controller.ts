import { Controller, Get } from '@nestjs/common';
import { SchemesService } from './schemes.service.js';
import { SchemeListResponseDto } from './dto/scheme-list.dto.js';

@Controller('schemes')
export class SchemesController {
  constructor(private readonly schemesService: SchemesService) {}

  @Get()
  getSchemesList(): Promise<SchemeListResponseDto> {
    return this.schemesService.findAll();
  }
}
