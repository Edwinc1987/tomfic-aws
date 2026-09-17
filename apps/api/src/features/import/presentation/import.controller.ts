import { BadRequestException, Body, Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { ApiAuthGuard } from "../../../core/auth/cognito-auth.guard";
import { requirePermission } from "../../../core/auth/authorization";
import { S3StorageService } from "../../../core/storage/s3-storage.service";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

@Controller("v1/import")
@UseGuards(ApiAuthGuard)
export class ImportController{
  private readonly sqs=process.env.IMPORT_QUEUE_URL?new SQSClient({region:process.env.AWS_REGION||"us-east-1"}):null;

  constructor(private readonly storage:S3StorageService){}

  @Post("csv")
  async importCsv(
    @Req() request:{auth:{tenantId:string;role:string;userId:string}},
    @Body() body:{inventoryId?:string;fileName?:string},
  ){
    requirePermission(request.auth,"import:create");
    if(!body.inventoryId?.trim())throw new BadRequestException("inventoryId es obligatorio");
    if(!body.fileName?.trim())throw new BadRequestException("fileName es obligatorio");

    const{url,key}=await this.storage.createUploadUrl(request.auth.tenantId,body.fileName,"text/csv");

    if(!this.sqs){
      return{uploadUrl:url,key,status:"upload_pending",message:"Sube el CSV y el procesamiento comenzará automáticamente"};
    }

    const tenantId=request.auth.tenantId;
    const inventoryId=body.inventoryId;
    await this.sqs.send(new SendMessageCommand({
      QueueUrl:process.env.IMPORT_QUEUE_URL!,
      MessageBody:JSON.stringify({tenantId,inventoryId,fileName:body.fileName,key}),
    }));

    return{uploadUrl:url,key,status:"queued",message:"CSV en cola para procesamiento"};
  }
}
