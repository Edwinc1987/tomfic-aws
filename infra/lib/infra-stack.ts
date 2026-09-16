import * as cdk from 'aws-cdk-lib/core';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
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

    // example resource
    // const queue = new sqs.Queue(this, 'InfraQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
