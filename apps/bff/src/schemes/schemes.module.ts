import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SchemesController } from './schemes.controller.js';
import { SchemesService } from './schemes.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [SchemesController],
  providers: [SchemesService],
})
export class SchemesModule {}
