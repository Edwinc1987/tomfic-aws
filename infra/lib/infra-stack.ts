import * as cdk from 'aws-cdk-lib/core';
import * as cognito from 'aws-cdk-lib/aws-cognito';
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

    // example resource
    // const queue = new sqs.Queue(this, 'InfraQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
