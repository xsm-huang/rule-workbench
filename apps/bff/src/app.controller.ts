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

  @Get('schemes')
  getSchemesList() {
    return {
      items: [
        {
          id: 'scheme-001',
          code: 'SC2026001',
          name: '华东区域销售方案',
          pricingMode: 'UNIT_PRICE',
          status: 'DRAFT',
          ownerName: '张三',
          updatedAt: '2026-09-20 14:30',
        },
      ],
    };
  }
}
