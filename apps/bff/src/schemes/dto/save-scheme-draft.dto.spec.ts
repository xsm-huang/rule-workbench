import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  PRICING_MODES,
  RULE_GROUP_DEFINITIONS,
  type SaveDraftInput,
} from '@rule-workbench/contracts';
import { SaveSchemeDraftDto } from './save-scheme-draft.dto.js';

function createInput(): SaveDraftInput {
  return {
    name: '  已有草稿  ',
    scope: '  华东区域  ',
    pricingMode: PRICING_MODES.UNIT_PRICE,
    effectiveDate: '2026-10-01',
    baseVersion: 3,
    content: {
      groups: RULE_GROUP_DEFINITIONS.map((group) => ({
        ...group,
        rows: [
          {
            id: `${group.key}-row-1`,
            rangeStart: 0,
            rangeEnd: null,
            unitPrice: null,
            totalAmount: null,
            qualityFactor: 1,
            timelinessFactor: 1,
            complexityFactor: 1,
            riskFactor: 1,
            effectiveDate: '',
            enabled: true,
            remark: '',
          },
        ],
      })),
    },
  };
}

function validateInput(input: object) {
  const dto = plainToInstance(SaveSchemeDraftDto, input);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe('SaveSchemeDraftDto', () => {
  it('继承基本信息转换与校验，允许保存尚未填完的草稿', async () => {
    const input = createInput();
    const dto = plainToInstance(SaveSchemeDraftDto, input);

    expect(
      await validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).toEqual([]);
    expect(dto.name).toBe('已有草稿');
    expect(dto.scope).toBe('华东区域');
    expect(dto.baseVersion).toBe(3);
    expect(dto.content).toEqual(input.content);
  });

  it.each([undefined, null, 0, -1, 1.5, '3', true, NaN, Infinity])(
    '拒绝无效版本号 %s，不能缺失版本或把字符串隐式转为版本号',
    async (baseVersion) => {
      const errors = await validateInput({ ...createInput(), baseVersion });

      expect(errors.map((error) => error.property)).toContain('baseVersion');
    },
  );

  it.each([
    { name: '  ' },
    { scope: '' },
    { pricingMode: 'UNKNOWN' },
    { effectiveDate: '2026-02-30' },
    { content: null },
  ])('继承校验仍拒绝无效的基本信息 %j', async (invalidFields) => {
    const errors = await validateInput({ ...createInput(), ...invalidFields });

    expect(errors.map((error) => error.property)).toContain(
      Object.keys(invalidFields)[0],
    );
  });

  it('拒绝客户端注入负责人、状态或服务端编辑版本', async () => {
    const errors = await validateInput({
      ...createInput(),
      ownerId: 'another-user',
      status: 'PUBLISHED',
      editVersion: 100,
    });

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['ownerId', 'status', 'editVersion']),
    );
  });
});
