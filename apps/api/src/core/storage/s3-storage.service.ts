import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class S3StorageService{
  private readonly client=new S3Client({region:process.env.AWS_REGION||"us-east-1"});

  async createUploadUrl(tenantId:string,fileName:string,contentType:string){
    const bucket=process.env.S3_BUCKET;
    if(!bucket)throw new ServiceUnavailableException("S3 no está configurado");
    const safeName=fileName.replace(/[^a-zA-Z0-9._-]/g,"-");
    const key=`tenants/${tenantId}/uploads/${crypto.randomUUID()}-${safeName}`;
    const command=new PutObjectCommand({Bucket:bucket,Key:key,ContentType:contentType,ServerSideEncryption:"AES256"});
    return{key,url:await getSignedUrl(this.client,command,{expiresIn:900})};
  }
}
