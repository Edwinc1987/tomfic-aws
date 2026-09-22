import { createHmac, timingSafeEqual } from "crypto";

// JWT firmado (HS256) para el login de equipo (team-login).
// Reemplaza el token opaco "team-{id}-{timestamp}" que no era verificable.
// AUTH_SECRET debe configurarse en producción (ej: `openssl rand -hex 32`).

export type TeamJwtPayload={sub:string;tenantId:string;role:string;exp:number};

const authSecret=()=>process.env.AUTH_SECRET||process.env.JWT_SECRET||"";

const b64urlFromJson=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString("base64url");

const hmacSignature=(data:string,secret:string)=>{
  return createHmac("sha256",secret).update(data).digest("base64url");
};

export const signTeamJwt=(payload:{sub:string;tenantId:string;role:string},ttlSeconds=43200):string=>{
  const secret=authSecret();
  if(!secret)throw new Error("AUTH_SECRET no está configurado");
  const header=b64urlFromJson({alg:"HS256",typ:"JWT"});
  const body=b64urlFromJson({...payload,exp:Math.floor(Date.now()/1000)+ttlSeconds});
  const signature=hmacSignature(`${header}.${body}`,secret);
  return `${header}.${body}.${signature}`;
};

export const verifyTeamJwt=(token:string):TeamJwtPayload|null=>{
  const secret=authSecret();
  if(!secret)return null;
  const parts=token.split(".");
  if(parts.length!==3)return null;
  const [header,body,signature]=parts;
  const expected=hmacSignature(`${header}.${body}`,secret);
  const received=Buffer.from(signature);
  const expectedBuffer=Buffer.from(expected);
  if(received.length!==expectedBuffer.length||!timingSafeEqual(received,expectedBuffer))return null;
  try{
    const payload=JSON.parse(Buffer.from(body,"base64url").toString()) as TeamJwtPayload;
    if(!payload.exp||payload.exp<Math.floor(Date.now()/1000))return null;
    if(!payload.sub||!payload.tenantId||!payload.role)return null;
    return payload;
  }catch{
    return null;
  }
};
