import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { DevAuthGuard } from "./dev-auth.guard";

@Injectable()
export class ApiAuthGuard implements CanActivate{
  private readonly dev=new DevAuthGuard();
  private readonly verifier=process.env.COGNITO_USER_POOL_ID&&process.env.COGNITO_CLIENT_ID
    ?CognitoJwtVerifier.create({userPoolId:process.env.COGNITO_USER_POOL_ID,tokenUse:"access",clientId:process.env.COGNITO_CLIENT_ID})
    :null;

  async canActivate(context:ExecutionContext){
    if(process.env.AUTH_MODE!=="cognito")return this.dev.canActivate(context);
    if(!this.verifier)throw new UnauthorizedException("Cognito no está configurado");
    const request=context.switchToHttp().getRequest();
    const header=String(request.headers.authorization||"");
    if(!header.startsWith("Bearer "))throw new UnauthorizedException("Token requerido");
    try{
      const payload=await this.verifier.verify(header.slice(7));
      const groups=Array.isArray(payload["cognito:groups"])?payload["cognito:groups"]:[];
      const role=groups[0]||"ADMIN";
      const tenantId=String(request.headers["x-tenant-id"]||"").trim()||String(payload.sub||"");
      if(!tenantId)throw new UnauthorizedException("Se requiere x-tenant-id header");
      request.auth={userId:String(payload.sub),email:String(payload.email||""),tenantId,role};
      return true;
    }catch(error){
      if(error instanceof UnauthorizedException)throw error;
      throw new UnauthorizedException("Token de Cognito inválido");
    }
  }
}
