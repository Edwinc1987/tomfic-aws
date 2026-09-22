import { CountRoundName } from "@prisma/client";

export type CountSummary={
  id:string;tenantId:string;inventoryId:string;
  name:string;status:string;
  // Campos extendidos que devuelve el repositorio Prisma (legacy SPA):
  nombre?:string;ubicacion?:string;locLabel?:string;tipo?:string;estado?:string;
  usuarioC1?:string|null;usuarioC2?:string|null;usuarioC3?:string|null;
  rondasCerradas?:string[];fechaCreacion?:string;
  c1Cerrado?:boolean;c2Cerrado?:boolean;c3Cerrado?:boolean;
};
export type RoundSummary={id:string;countId:string;name:CountRoundName;status:string;assignedToId:string|null;closedAt:Date|null};

export interface CountRepository{
  create(tenantId:string,inventoryId:string,name:string,location:string,rounds:CountRoundName[],tipo?:string,locLabel?:string):Promise<CountSummary>;
  list(tenantId:string,inventoryId:string):Promise<CountSummary[]>;
  assignRound(tenantId:string,countId:string,round:CountRoundName,userId:string):Promise<void>;
  closeRound(tenantId:string,countId:string,round:CountRoundName):Promise<RoundSummary>;
  reopenRound(tenantId:string,countId:string,round:CountRoundName):Promise<RoundSummary>;
  delete(tenantId:string,countId:string):Promise<void>;
}
