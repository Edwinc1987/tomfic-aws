import { Capture } from "@prisma/client";

export type CaptureInput={
  operationId:string;
  tenantId:string;
  productId:string;
  roundId:string;
  quantity:number;
  condition:string;
};

export interface CaptureRepository{
  createIdempotent(input:CaptureInput):Promise<Capture>;
}
