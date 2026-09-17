import { BadRequestException, Body, Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { ApiAuthGuard } from "../auth/cognito-auth.guard";
import { S3StorageService } from "./s3-storage.service";

@Controller("v1/files")
@UseGuards(ApiAuthGuard)
export class StorageController{
  constructor(private readonly storage:S3StorageService){}

  @Post("upload-url")
  uploadUrl(@Req() request:{auth:{tenantId:string}},@Body() body:{fileName?:string;contentType?:string}){
    if(!body.fileName?.trim()||!body.contentType?.trim())throw new BadRequestException("fileName y contentType son obligatorios");
    return this.storage.createUploadUrl(request.auth.tenantId,body.fileName,body.contentType);
  }
}
