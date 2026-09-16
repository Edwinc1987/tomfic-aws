import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { authContextFromHeaders } from "./auth-context";

@Injectable()
export class DevAuthGuard implements CanActivate{
  canActivate(context:ExecutionContext){
    const request=context.switchToHttp().getRequest();
    const auth=authContextFromHeaders(request.headers);
    if(!auth)throw new UnauthorizedException("Autenticación requerida");
    request.auth=auth;
    return true;
  }
}
