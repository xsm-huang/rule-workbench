import { Controller, Get } from '@nestjs/common';
import { WorkbenchService } from './workbench.service.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import { type AuthUser, WorkbenchBootstrap } from '@rule-workbench/contracts';

@Controller('workbench')
export class WorkbenchController {
  constructor(private readonly workbenchService: WorkbenchService) {}

  /** 工作台初始化接口 */
  @Get('bootstrap')
  getBootstrap(@CurrentUser() user: AuthUser): Promise<WorkbenchBootstrap> {
    return this.workbenchService.getBootstrap(user);
  }
}
