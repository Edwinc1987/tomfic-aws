export type TenantId = string;
export type ProductId = string;
export type InventoryId = string;
export type CountId = string;
export type CountRound = "C1" | "C2" | "C3";

export type ProductSummary = {
  id: ProductId;
  tenantId: TenantId;
  inventoryId: InventoryId;
  code: string;
  barcode: string;
  name: string;
  balance: number;
  cost: number;
};

export type CloseCountRoundCommand = {
  countId: CountId;
  round: CountRound;
  operationId: string;
};
