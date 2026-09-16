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
      const tenantId=String(payload["custom:tenant_id"]||payload["tenant_id"]||"");
      if(!tenantId)throw new UnauthorizedException("El token no tiene tenant_id");
      request.auth={userId:String(payload.sub),tenantId,role:String(payload["custom:role"]||payload["cognito:groups"]?.[0]||"USER")};
      return true;
    }catch(error){
      if(error instanceof UnauthorizedException)throw error;
      throw new UnauthorizedException("Token de Cognito inválido");
    }
  }
}
