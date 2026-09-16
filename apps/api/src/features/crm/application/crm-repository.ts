export interface CrmRepository{
  dashboard(tenantId:string,role:string):Promise<unknown>;
  getCompany(tenantId:string):Promise<unknown>;
  changeStage(tenantId:string,actorId:string,stage:string):Promise<unknown>;
  listContacts(tenantId:string):Promise<unknown[]>;
  createContact(tenantId:string,actorId:string,input:{name:string;email?:string;phone?:string;position?:string}):Promise<unknown>;
  listActivities(tenantId:string):Promise<unknown[]>;
  createActivity(tenantId:string,actorId:string,input:{type:string;title:string;description?:string;dueAt?:string;ownerId?:string}):Promise<unknown>;
  createNote(tenantId:string,authorId:string,body:string):Promise<unknown>;
  listPayments(tenantId:string):Promise<unknown[]>;
  registerPayment(tenantId:string,actorId:string,input:{amount:number;paidAt?:string;receiptKey?:string;note?:string}):Promise<unknown>;
  listTickets(tenantId:string):Promise<unknown[]>;
  createTicket(tenantId:string,actorId:string,input:{title:string;description?:string;priority?:string}):Promise<unknown>;
  getHealth(tenantId:string):Promise<unknown>;
}
