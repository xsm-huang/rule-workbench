import { Controller, Get } from '@nestjs/common';
import { Public } from './common/auth/public.decorator.js';

@Controller()
export class AppController {
  @Get('health')
  @Public()
  getHealth() {
    return {
      status: 'ok',
      service: 'rule-workbench-bff',
      timestamp: new Date().toISOString(),
    };
  }
}
