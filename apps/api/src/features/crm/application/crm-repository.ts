export interface CrmRepository{
  dashboard(tenantId:string,role:string):Promise<unknown>;
  getCompany(tenantId:string):Promise<unknown>;
  changeStage(tenantId:string,stage:string):Promise<unknown>;
  listContacts(tenantId:string):Promise<unknown[]>;
  createContact(tenantId:string,input:{name:string;email?:string;phone?:string;position?:string}):Promise<unknown>;
  listActivities(tenantId:string):Promise<unknown[]>;
  createActivity(tenantId:string,input:{type:string;title:string;description?:string;dueAt?:string;ownerId?:string}):Promise<unknown>;
  createNote(tenantId:string,authorId:string,body:string):Promise<unknown>;
  listPayments(tenantId:string):Promise<unknown[]>;
  registerPayment(tenantId:string,input:{amount:number;paidAt?:string;receiptKey?:string;note?:string}):Promise<unknown>;
}
