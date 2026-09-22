import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'rule-workbench-bff',
      timestamp: new Date().toISOString(),
    };
  }
}
