import { PrismaClient } from "@prisma/client";

const db=new PrismaClient();

type CsvRow={
  code?:string;
  barcode?:string;
  name?:string;
  balance?:string;
  cost?:string;
};

const parseCsvLine=(line:string):string[]=>{
  const result:string[]=[];
  let current="";
  let inQuotes=false;
  for(let i=0;i<line.length;i++){
    const char=line[i];
    if(char==='"'){inQuotes=!inQuotes;continue;}
    if(char===","&&!inQuotes){result.push(current.trim());current="";continue;}
    current+=char;
  }
  result.push(current.trim());
  return result;
};

const mapRow=(headers:string[],row:string[]):CsvRow=>{
  const obj:any={};
  headers.forEach((h,i)=>{obj[h.toLowerCase().trim()]=row[i]||"";});
  return obj;
};

export const handler=async(event:any)=>{
  const body=typeof event.body==="string"?JSON.parse(event.body):event.body||{};
  const {tenantId,inventoryId,fileName}=body;

  if(!tenantId||!inventoryId||!fileName){
    return{statusCode:400,body:JSON.stringify({error:"tenantId, inventoryId y fileName son obligatorios"})};
  }

  const key=`tenants/${tenantId}/imports/${fileName}`;
  const bucket=process.env.STORAGE_BUCKET||process.env.S3_BUCKET;
  if(!bucket)return{statusCode:500,body:JSON.stringify({error:"S3 no configurado"})};

  try{
    const s3Module=await import("@aws-sdk/client-s3");
    const s3Client=new s3Module.S3Client({region:process.env.AWS_REGION||"us-east-1"});
    const obj=await s3Client.send(new s3Module.GetObjectCommand({Bucket:bucket,Key:key}));
    const bodyStr=await new TextDecoder().decode(await obj.Body!.transformToByteArray());

    const lines=bodyStr.split(/\r?\n/).filter(l=>l.trim());
    if(lines.length<2)return{statusCode:400,body:JSON.stringify({error:"El CSV debe tener encabezados y al menos una fila"})};

    const headers=parseCsvLine(lines[0]);
    const rows=lines.slice(1).map(l=>mapRow(headers,parseCsvLine(l)));

    const BATCH_SIZE=500;
    let imported=0;
    let skipped=0;

    for(let i=0;i<rows.length;i+=BATCH_SIZE){
      const batch=rows.slice(i,i+BATCH_SIZE);
      const valid=batch.filter(r=>r.name&&r.code).map(r=>({
        id:crypto.randomUUID(),
        tenantId,
        inventoryId,
        code:r.code||"",
        barcode:r.barcode||"",
        name:r.name||"",
        balance:Math.max(0,Number(r.balance)||0),
        cost:Math.max(0,Number(r.cost)||0),
      }));

      if(valid.length){
        await db.product.createMany({data:valid,skipDuplicates:true});
        imported+=valid.length;
      }
      skipped+=batch.length-valid.length;
    }

    return{statusCode:200,body:JSON.stringify({imported,skipped,total:rows.length})};
  }catch(err:any){
    console.error("Error procesando CSV:",err);
    return{statusCode:500,body:JSON.stringify({error:err.message||"Error procesando el archivo"})};
  }
};
