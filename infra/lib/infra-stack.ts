import * as cdk from 'aws-cdk-lib/core';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const userPool=new cognito.UserPool(this,"TomficUserPool",{
      userPoolName:"tomfic-aws-users",
      selfSignUpEnabled:false,
      signInAliases:{email:true},
      passwordPolicy:{minLength:12,requireLowercase:true,requireUppercase:true,requireDigits:true,requireSymbols:true},
      standardAttributes:{email:{required:true,mutable:true}},
      removalPolicy:cdk.RemovalPolicy.RETAIN,
    });
    const userPoolClient=userPool.addClient("TomficWebClient",{authFlows:{userPassword:true,userSrp:true}});
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

    // RDS is opt-in until the budget, backup, and network plan are approved.
    if(process.env.ENABLE_RDS==="true"){
      const vpc=new ec2.Vpc(this,"TomficVpc",{maxAzs:2,natGateways:0,subnetConfiguration:[{name:"database",subnetType:ec2.SubnetType.PRIVATE_ISOLATED,cidrMask:24}]});
      const database=new rds.DatabaseInstance(this,"TomficDatabase",{
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

    // example resource
    // const queue = new sqs.Queue(this, 'InfraQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
