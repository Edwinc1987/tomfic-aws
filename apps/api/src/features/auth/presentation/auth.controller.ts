import { Controller, Post, Body, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { signTeamJwt } from "../../../core/auth/team-jwt";

const db=new PrismaClient();

function hashPassword(password:string,salt?:string){
  const s=salt||randomBytes(16).toString("hex");
  const hash=scryptSync(password,s,64).toString("hex");
  return `${s}:${hash}`;
}

function verifyPassword(password:string,stored:string){
  const [s,hash]=stored.split(":");
  const test=scryptSync(password,s,64).toString("hex");
  return timingSafeEqual(Buffer.from(hash,"hex"),Buffer.from(test,"hex"));
}

@Controller("v1/auth")
export class AuthController{

  @Post("team-login")
  async teamLogin(@Body() body:{nit?:string;email?:string;name?:string;password?:string}){
    const {nit,email,name,password}=body||{};
    if(!password)throw new BadRequestException("Contraseña requerida");

    let user:any=null;
    if(email){
      user=await db.user.findUnique({where:{email:email.trim().toLowerCase()}});
    }else if(nit&&name){
      const tenant=await db.tenant.findFirst({where:{taxId:nit.trim()}});
      if(!tenant)throw new UnauthorizedException("Empresa no encontrada");
      user=await db.user.findFirst({where:{tenantId:tenant.id,name:{equals:name.trim(),mode:"insensitive"}}});
    }
    if(!user)throw new UnauthorizedException("Usuario no encontrado");
    if(!user.active)throw new UnauthorizedException("Usuario desactivado");
    if(!user.passwordHash){
      throw new UnauthorizedException("Usuario sin contraseña configurada. Pide al admin que recreate tu cuenta.");
    }
    if(!verifyPassword(password,user.passwordHash)){
      throw new UnauthorizedException("Contraseña incorrecta");
    }

    const tenant=await db.tenant.findUnique({where:{id:user.tenantId}});
    // JWT firmado (HS256, 12h de validez) verificable por ApiAuthGuard.
    // El guard re-resuelve tenant y rol desde la BD en cada request.
    const token=signTeamJwt({sub:user.id,tenantId:user.tenantId,role:String(user.role)});
    return {
      user:{id:user.id,name:user.name,email:user.email,role:user.role,tenantId:user.tenantId,inventoryId:user.inventoryId},
      tenant:tenant?{id:tenant.id,name:tenant.name,nit:tenant.taxId}:null,
      token,
    };
  }
}

export {hashPassword,verifyPassword};
