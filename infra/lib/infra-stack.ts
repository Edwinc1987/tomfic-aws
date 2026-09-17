import * as cdk from 'aws-cdk-lib/core';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool=new cognito.UserPool(this,"TomficUserPool",{
      userPoolName:"tomfic-aws-users",
      selfSignUpEnabled:false,
      signInAliases:{email:true},
      passwordPolicy:{minLength:12,requireLowercase:true,requireUppercase:true,requireDigits:true,requireSymbols:true},
      standardAttributes:{email:{required:true,mutable:true}},
      customAttributes:{tenant_id:new cognito.StringAttribute({mutable:true}),role:new cognito.StringAttribute({mutable:true})},
      removalPolicy:cdk.RemovalPolicy.RETAIN,
    });
    const userPoolClient=userPool.addClient("TomficWebClient",{authFlows:{userPassword:true,userSrp:true},oAuth:{scopes:[cognito.OAuthScope.OPENID,cognito.OAuthScope.PROFILE,cognito.OAuthScope.EMAIL]}});
    new cdk.CfnOutput(this,"UserPoolId",{value:userPool.userPoolId});
    new cdk.CfnOutput(this,"UserPoolClientId",{value:userPoolClient.userPoolClientId});

    const deadLetterQueue=new sqs.Queue(this,"ImportDeadLetterQueue",{
      encryption:sqs.QueueEncryption.SQS_MANAGED,
      retentionPeriod:cdk.Duration.days(14),
    });
    const importQueue=new sqs.Queue(this,"ImportQueue",{
      encryption:sqs.QueueEncryption.SQS_MANAGED,
      visibilityTimeout:cdk.Duration.minutes(5),
      deadLetterQueue:{queue:deadLetterQueue,maxReceiveCount:3},
    });
    const storageBucket=new s3.Bucket(this,"TomficPrivateStorage",{
      blockPublicAccess:s3.BlockPublicAccess.BLOCK_ALL,
      encryption:s3.BucketEncryption.S3_MANAGED,
      enforceSSL:true,
      versioned:true,
      removalPolicy:cdk.RemovalPolicy.RETAIN,
    });
    new cdk.CfnOutput(this,"ImportQueueUrl",{value:importQueue.queueUrl});
    new cdk.CfnOutput(this,"StorageBucketName",{value:storageBucket.bucketName});

    let database: rds.DatabaseInstance | undefined;
    if(process.env.ENABLE_RDS==="true"){
      const vpc=new ec2.Vpc(this,"TomficVpc",{maxAzs:2,natGateways:0,subnetConfiguration:[{name:"database",subnetType:ec2.SubnetType.PRIVATE_ISOLATED,cidrMask:24}]});
      database=new rds.DatabaseInstance(this,"TomficDatabase",{
        engine:rds.DatabaseInstanceEngine.postgres({version:rds.PostgresEngineVersion.VER_16_3}),
        vpc,
        vpcSubnets:{subnetType:ec2.SubnetType.PRIVATE_ISOLATED},
        instanceType:ec2.InstanceType.of(ec2.InstanceClass.T4G,ec2.InstanceSize.MICRO),
        allocatedStorage:20,
        maxAllocatedStorage:100,
        storageEncrypted:true,
        databaseName:"tomfic",
        credentials:rds.Credentials.fromGeneratedSecret("tomfic_admin"),
        publiclyAccessible:false,
        multiAz:false,
        deletionProtection:false,
        removalPolicy:cdk.RemovalPolicy.SNAPSHOT,
      });
      new cdk.CfnOutput(this,"DatabaseEndpoint",{value:database.dbInstanceEndpointAddress});
    }

    const apiLambda=new lambda.Function(this,"TomficApiLambda",{
      runtime:lambda.Runtime.NODEJS_20_X,
      handler:"lambda.handler",
      code:lambda.Code.fromAsset(path.join(__dirname,"../../apps/api/dist"),{
        bundling:{image:lambda.Runtime.NODEJS_20_X.bundlingImage,command:["sh","-c","npm install --omit=dev && cp -r node_modules /asset-output && cp -r prisma /asset-output && cp -r src /asset-output"],volumes:[{hostVolume:path.join(__dirname,"../../apps/api/node_modules"),containerPath:"/var/task/node_modules"}],localBundling:true},
      }),
      memorySize:1024,
      timeout:cdk.Duration.seconds(30),
      environment:{
        DATABASE_URL:database?`postgresql://tomfic_admin:${database.secret?.secretValue?.unsafeUnwrap()||"changeme"}@${database.dbInstanceEndpointAddress}:${database.dbInstanceEndpointPort}/tomfic`:"postgresql://postgres:postgres@localhost:5432/tomfic_dev",
        AUTH_MODE:"cognito",
        COGNITO_USER_POOL_ID:userPool.userPoolId,
        COGNITO_CLIENT_ID:userPoolClient.userPoolClientId,
        STORAGE_BUCKET:storageBucket.bucketName,
        NODE_ENV:"production",
      },
    });
    storageBucket.grantReadWrite(apiLambda);
    importQueue.grantSendMessages(apiLambda);
    if(database){database.secret?.grantRead(apiLambda);}

    const apiLogs=new logs.LogGroup(this,"TomficApiLogs",{logGroupName:"/aws/lambda/tomfic-api",retention:cdk.RetentionDays.TWO_WEEKS,removalPolicy:cdk.RemovalPolicy.DESTROY});
    const api=new apigw.LambdaRestApi(this,"TomficApiGateway",{
      handler:apiLambda,
      proxy:true,
      deployOptions:{stageName:"v1",tracingEnabled:true,loggingLevel:apigw.MethodLoggingLevel.INFO,accessLogDestination:new apigw.LogGroupLogDestination(apiLogs),metricsEnabled:true},
      defaultCorsPreflightOptions:{allowOrigins:apigw.Cors.ALL_ORIGINS,allowMethods:apigw.Cors.ALL_METHODS,allowHeaders:["Content-Type","Authorization","x-tenant-id","x-user-role","x-user-id"]},
    });
    new cdk.CfnOutput(this,"ApiUrl",{value:api.url});

    const userPoolDomain=new cognito.UserPoolDomain(this,"TomficUserPoolDomain",{
      userPool,
      cognitoDomain:{domainPrefix:"tomfic-aws-auth"},
    });
    new cdk.CfnOutput(this,"UserPoolDomain",{value:userPoolDomain.domainName});

    const importProcessorLambda=new lambda.Function(this,"ImportProcessorLambda",{
      runtime:lambda.Runtime.NODEJS_20_X,
      handler:"import-lambda.handler",
      code:lambda.Code.fromAsset(path.join(__dirname,"../../apps/api/dist"),{
        bundling:{image:lambda.Runtime.NODEJS_20_X.bundlingImage,command:["sh","-c","npm install --omit=dev && cp -r node_modules /asset-output && cp -r prisma /asset-output && cp -r src /asset-output"],volumes:[{hostVolume:path.join(__dirname,"../../apps/api/node_modules"),containerPath:"/var/task/node_modules"}],localBundling:true},
      }),
      memorySize:1536,
      timeout:cdk.Duration.minutes(5),
      environment:{
        DATABASE_URL:database?`postgresql://tomfic_admin:${database.secret?.secretValue?.unsafeUnwrap()||"changeme"}@${database.dbInstanceEndpointAddress}:${database.dbInstanceEndpointPort}/tomfic`:"postgresql://postgres:postgres@localhost:5432/tomfic_dev",
        STORAGE_BUCKET:storageBucket.bucketName,
        NODE_ENV:"production",
      },
    });
    storageBucket.grantReadWrite(importProcessorLambda);
    if(database){database.secret?.grantRead(importProcessorLambda);}
    importProcessorLambda.addEventSource(new lambda.SqsEventSource(importQueue,{batchSize:1,batchWindow:cdk.Duration.seconds(10)}));
  }
}
