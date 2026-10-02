import { Controller, Get } from '@nestjs/common';
import { workbenchService } from './workbench.service.js';
import { CurrentUser } from '../common/auth/current-user.decorator.js';
import { type AuthUser, WorkbenchBootstrap } from '@rule-workbench/contracts';

@Controller('workbench')
export class WorkbenchController {
  constructor(private readonly workbenchService: workbenchService) {}

  /** 工作台初始化接口 */
  @Get('bootstrap')
  getBootstrap(@CurrentUser() user: AuthUser): Promise<WorkbenchBootstrap> {
    return this.workbenchService.getBootstrap(user);
  }
}
