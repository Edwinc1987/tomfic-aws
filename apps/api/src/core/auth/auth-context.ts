export type AuthContext={
  userId:string;
  tenantId:string;
  role:string;
};

export const authContextFromHeaders=(headers:Record<string,unknown>):AuthContext|null=>{
  if(process.env.NODE_ENV==="production")return null;
  const tenantId=String(headers["x-tenant-id"]||"").trim();
  if(!tenantId)return null;
  return{
    userId:String(headers["x-user-id"]||"local-user"),
    tenantId,
    role:String(headers["x-user-role"]||"ADMIN"),
  };
};
