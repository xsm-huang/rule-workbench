import type {
  PricingMode,
  SchemeStatus,
} from '../../generated/prisma/client.js';

export interface SchemeListItemDto {
  id: string;
  code: string;
  name: string;
  pricingMode: PricingMode;
  status: SchemeStatus;
  ownerName: string;
  updatedAt: string;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export type SchemeListResponseDto = PageResult<SchemeListItemDto>;
