import { Capture, CountRoundName } from "@prisma/client";

export type CaptureInput={
  operationId:string;
  tenantId:string;
  productId:string;
  roundId?:string;
  countId?:string;
  round?:CountRoundName;
  quantity:number;
  condition:string;
};

export interface CaptureRepository{
  createIdempotent(input:CaptureInput):Promise<Capture>;
}
