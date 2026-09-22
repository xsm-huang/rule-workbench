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

export interface SchemeListResponseDto {
  items: SchemeListItemDto[];
}
