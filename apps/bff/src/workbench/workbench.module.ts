import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { WorkbenchController } from './workbench.controller.js';
import { workbenchService } from './workbench.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [WorkbenchController],
  providers: [workbenchService],
})
export class WorkbenchModule {}
