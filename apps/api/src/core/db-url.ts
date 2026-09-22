import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

// Resuelve la DATABASE_URL real y el AUTH_SECRET en producción.
// El stack CDK NO inyecta la contraseña en texto plano en las variables de
// entorno (queda visible en la consola de Lambda/CloudFormation). En su lugar
// inyecta DB_SECRET_ARN / AUTH_SECRET_ARN y aquí se resuelven desde Secrets
// Manager. En desarrollo local las env vars llegan completas por .env.

let cached:Promise<void>|null=null;

const placeholderMarkers=["***","__FROM_SECRETS_MANAGER__"];

const looksLikePlaceholder=(url:string)=>!url||placeholderMarkers.some(m=>url.includes(m));

const fetchSecretJson=async(arn:string):Promise<Record<string,unknown>>=>{
  const client=new SecretsManagerClient({region:process.env.AWS_REGION||"us-east-1"});
  const result=await client.send(new GetSecretValueCommand({SecretId:arn}));
  if(!result.SecretString)throw new Error(`El secreto ${arn} está vacío`);
  return JSON.parse(result.SecretString);
};

const buildUrlFromSecret=(secretJson:Record<string,unknown>):string=>{
  const host=secretJson.host||secretJson.hostname;
  const port=secretJson.port||5432;
  const username=secretJson.username;
  const password=secretJson.password;
  const dbname=secretJson.dbname||secretJson.database||"tomfic";
  if(!host||!username||!password){
    throw new Error("El secreto de RDS no contiene host/username/password");
  }
  const encodedPassword=encodeURIComponent(String(password));
  return `postgresql://${encodeURIComponent(String(username))}:${encodedPassword}@${host}:${port}/${dbname}?sslmode=require`;
};

export const ensureDatabaseUrl=async():Promise<void>=>{
  if(cached)return cached;
  cached=(async()=>{
    const url=process.env.DATABASE_URL||"";
    const secretArn=process.env.DB_SECRET_ARN||"";
    if(!looksLikePlaceholder(url))return; // URL completa ya presente (dev local)
    if(!secretArn)throw new Error("DATABASE_URL incompleta y DB_SECRET_ARN no está configurado");
    process.env.DATABASE_URL=buildUrlFromSecret(await fetchSecretJson(secretArn));
  })().catch(error=>{cached=null;throw error;});
  return cached;
};

// Resuelve AUTH_SECRET (clave HMAC de los JWT de team-login) desde Secrets
// Manager. En desarrollo local basta con definir AUTH_SECRET en .env.
export const ensureAuthSecret=async():Promise<void>=>{
  if(process.env.AUTH_SECRET)return;
  const arn=process.env.AUTH_SECRET_ARN||"";
  if(!arn)throw new Error("AUTH_SECRET no está configurado (ni AUTH_SECRET_ARN)");
  const json=await fetchSecretJson(arn);
  const value=json.value||json.AUTH_SECRET||json.password;
  if(!value)throw new Error("El secreto AUTH_SECRET no contiene el campo 'value'");
  process.env.AUTH_SECRET=String(value);
};
