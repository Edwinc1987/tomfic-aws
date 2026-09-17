import { AuthContext } from "./auth-context";

export type Permission=
  |"tenant:manage"
  |"users:manage"
  |"products:read"
  |"products:write"
  |"inventories:manage"
  |"counts:read"
  |"counts:capture"
  |"counts:close"
  |"reports:read"
  |"billing:read"
  |"import:create";

const rolePermissions:Record<string,Permission[]>={
  OWNER:["tenant:manage","users:manage","products:read","products:write","inventories:manage","counts:read","counts:capture","counts:close","reports:read","billing:read","import:create"],
  ADMIN:["users:manage","products:read","products:write","inventories:manage","counts:read","counts:capture","counts:close","reports:read","billing:read","import:create"],
  MANAGER:["products:read","inventories:manage","counts:read","counts:close","reports:read"],
  CAPTURER:["products:read","counts:read","counts:capture"],
  COMMERCIAL:["tenant:manage","billing:read","reports:read"],
};

export const can=(context:AuthContext,permission:Permission)=>rolePermissions[context.role.toUpperCase()]?.includes(permission)??false;

export const requirePermission=(context:AuthContext,permission:Permission)=>{
  if(!can(context,permission))throw new ForbiddenException(`Permiso insuficiente: ${permission}`);
};
import { ForbiddenException } from "@nestjs/common";
