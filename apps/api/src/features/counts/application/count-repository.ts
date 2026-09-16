import { CountRoundName } from "@prisma/client";

export type CountSummary={id:string;tenantId:string;inventoryId:string;name:string;status:string};
export type RoundSummary={id:string;countId:string;name:CountRoundName;status:string;assignedToId:string|null;closedAt:Date|null};

export interface CountRepository{
  create(tenantId:string,inventoryId:string,name:string,location:string,rounds:CountRoundName[]):Promise<CountSummary>;
  list(tenantId:string,inventoryId:string):Promise<CountSummary[]>;
  closeRound(tenantId:string,countId:string,round:CountRoundName):Promise<RoundSummary>;
  reopenRound(tenantId:string,countId:string,round:CountRoundName):Promise<RoundSummary>;
}
