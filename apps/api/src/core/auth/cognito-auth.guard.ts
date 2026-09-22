import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { PrismaClient } from "@prisma/client";
import { verifyTeamJwt } from "./team-jwt";
import { DevAuthGuard } from "./dev-auth.guard";

// Guard unificado:
// 1. JWT de team-login (HS256, firmado con AUTH_SECRET) -> login por NIT.
// 2. Token de Cognito (producción) -> identidad REAL del usuario.
// 3. DevAuthGuard (solo AUTH_MODE != "cognito") -> desarrollo local.
//
// SEGURIDAD: tenantId y role SIEMPRE se resuelven desde la base de datos
// (tabla User), nunca desde headers enviados por el cliente.
// El rol por defecto es el de menor privilegio (CAPTURER), nunca ADMIN.

const db=new PrismaClient();

const MINIMUM_PRIVILEGE_ROLE="CAPTURER";

export const resolveAuthContext=async(userId:string,email:string)=>{
  // Identidad canónica: siempre la fila de User en la BD.
  const user=await db.user.findUnique({
    where:{id:userId},
    select:{id:true,tenantId:true,role:true,active:true,email:true},
  });
  if(user)return user;
  // Fallback por email (usuarios creados antes de sincronizar el sub de Cognito).
  if(email){
    const byEmail=await db.user.findFirst({
      where:{email:email.toLowerCase()},
      select:{id:true,tenantId:true,role:true,active:true,email:true},
    });
    if(byEmail)return byEmail;
  }
  return null;
};

@Injectable()
export class ApiAuthGuard implements CanActivate{
  private readonly dev=new DevAuthGuard();
  private readonly verifier=process.env.COGNITO_USER_POOL_ID&&process.env.COGNITO_CLIENT_ID
    ?CognitoJwtVerifier.create({userPoolId:process.env.COGNITO_USER_POOL_ID,tokenUse:"access",clientId:process.env.COGNITO_CLIENT_ID})
    :null;

  async canActivate(context:ExecutionContext){
    const request=context.switchToHttp().getRequest();
    const url=String(request.url||"");
    if(url.startsWith("/v1/auth/"))return true;

    const header=String(request.headers.authorization||"");

    // 1) JWT de team-login (firmado): se verifica primero; si la firma
    //    y la expiración son válidas, la identidad viene del token.
    if(header.startsWith("Bearer ")){
      const teamPayload=verifyTeamJwt(header.slice(7));
      if(teamPayload){
        const user=await resolveAuthContext(teamPayload.sub,"");
        if(!user||!user.active)throw new UnauthorizedException("Usuario no encontrado o desactivado");
        request.auth={userId:user.id,email:user.email||"",tenantId:user.tenantId,role:String(user.role)};
        return true;
      }
    }

    // 2) Cognito (producción).
    if(process.env.AUTH_MODE==="cognito"){
      if(!this.verifier)throw new UnauthorizedException("Cognito no está configurado");
      if(!header.startsWith("Bearer "))throw new UnauthorizedException("Token requerido");
      try{
        const payload=await this.verifier.verify(header.slice(7));
        const groups=Array.isArray(payload["cognito:groups"])?payload["cognito:groups"]:[];
        // Mínimo privilegio: el rol y el tenant SIEMPRE vienen de la BD.
        // Si el usuario no existe aún en la BD, se usa el grupo de Cognito;
        // sin grupo, el rol por defecto es CAPTURER (nunca ADMIN).
        const email=String(payload.email||"");
        const sub=String(payload.sub);
        const user=await resolveAuthContext(sub,email);
        const role=user?String(user.role):String(groups[0]||MINIMUM_PRIVILEGE_ROLE);
        const tenantId=user?user.tenantId:"";
        if(!tenantId)throw new UnauthorizedException("Usuario sin empresa asociada");
        if(user&&!user.active)throw new UnauthorizedException("Usuario desactivado");
        request.auth={userId:user?user.id:sub,email,tenantId,role};
        return true;
      }catch(error){
        if(error instanceof UnauthorizedException)throw error;
        throw new UnauthorizedException("Token de Cognito inválido");
      }
    }

    // 3) Desarrollo local.
    return this.dev.canActivate(context);
  }
}
