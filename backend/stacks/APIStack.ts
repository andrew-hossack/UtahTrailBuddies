import * as eventbridge from "aws-cdk-lib/aws-events";
import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import { CnameRecord, HostedZone } from "aws-cdk-lib/aws-route53";
import path = require("path");
import { UserPool } from "aws-cdk-lib/aws-cognito";

export interface APIStackProps extends cdk.StackProps {}

export class APIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: APIStackProps) {
    super(scope, id, props);
    const imagesBucketName = process.env.IMAGES_BUCKET_NAME;
    const domainName = process.env.DOMAIN_NAME;
    const apiDomainName = process.env.API_DOMAIN;
    const fromEmail = process.env.FROM_EMAIL;
    const userPoolId = process.env.COGNITO_USER_POOL_ID;

    if (
      !(
        imagesBucketName &&
        domainName &&
        apiDomainName &&
        fromEmail &&
        userPoolId
      )
    ) {
      throw Error("Missing required environment config!");
    }

    // S3 Buckets
    const imagesBucket = new s3.Bucket(this, `ImagesBucket`, {
      bucketName: imagesBucketName,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: "IntelligentTieringRule",
          transitions: [
            {
              transitionAfter: cdk.Duration.days(1),
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
            },
          ],
          enabled: true,
        },
      ],
    });

    // DynamoDB Tables
    const usersTable = new dynamodb.Table(this, "UsersTable", {
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const eventsTable = new dynamodb.Table(this, "EventsTable", {
      partitionKey: { name: "eventId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "organizerId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    eventsTable.addGlobalSecondaryIndex({
      indexName: "search-index",
      partitionKey: { name: "status", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "searchField", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    eventsTable.addGlobalSecondaryIndex({
      indexName: "date-index",
      partitionKey: { name: "status", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "eventDate", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const eventParticipantsTable = new dynamodb.Table(
      this,
      "EventParticipantsTable",
      {
        partitionKey: { name: "eventId", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        stream: dynamodb.StreamViewType.KEYS_ONLY,
      }
    );

    // Create base Lambda role
    const lambdaRole = new iam.Role(this, "LambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // Grant DynamoDB permissions
    usersTable.grantReadWriteData(lambdaRole);
    eventsTable.grantReadWriteData(lambdaRole);
    eventParticipantsTable.grantReadWriteData(lambdaRole);
    imagesBucket.grantReadWrite(lambdaRole);

    // Lambda environment variables
    const lambdaEnvironment = {
      USERS_TABLE: usersTable.tableName,
      EVENTS_TABLE: eventsTable.tableName,
      EVENT_PARTICIPANTS_TABLE: eventParticipantsTable.tableName,
      IMAGES_BUCKET: imagesBucket.bucketName,
      COGNITO_USER_POOL_ID: userPoolId,
    };

    // Image Processing Lambda
    const imageProcessingFunction = new NodejsFunction(
      this,
      "ImageProcessingFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "imageProcessing.handler",
        entry: path.join(__dirname, "../src/handlers/imageProcessing.ts"),
        timeout: cdk.Duration.seconds(30),
        memorySize: 1024,
        environment: {
          BUCKET_NAME: imagesBucketName,
        },
      }
    );

    // Create notification Lambda
    const notificationFunction = new NodejsFunction(
      this,
      "NotificationFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "notifications.handler",
        entry: path.join(__dirname, "../src/handlers/notifications.ts"),
        role: lambdaRole,
        environment: {
          ...lambdaEnvironment,
          FROM_EMAIL: fromEmail,
        },
        timeout: cdk.Duration.seconds(30),
      }
    );

    // Add SES permissions
    notificationFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
      })
    );

    // Create auto-complete Lambda
    const autoCompleteFunction = new NodejsFunction(
      this,
      "AutoCompleteFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "autoComplete.handler",
        entry: path.join(__dirname, "../src/handlers/autoComplete.ts"),
        role: lambdaRole,
        environment: lambdaEnvironment,
        timeout: cdk.Duration.seconds(60),
      }
    );

    const rule = new eventbridge.Rule(this, "AutoCompleteRule", {
      schedule: eventbridge.Schedule.cron({ minute: "0", hour: "0" }), // Run at midnight UTC
    });
    rule.addTarget(new targets.LambdaFunction(autoCompleteFunction));

    // Set up DynamoDB Streams
    eventsTable.grantStreamRead(notificationFunction);
    eventParticipantsTable.grantStreamRead(notificationFunction);

    const eventStreamSource = new lambdaEventSources.DynamoEventSource(
      eventsTable,
      {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        batchSize: 10,
        retryAttempts: 3,
      }
    );

    const participantStreamSource = new lambdaEventSources.DynamoEventSource(
      eventParticipantsTable,
      {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        batchSize: 10,
        retryAttempts: 3,
      }
    );

    notificationFunction.addEventSource(eventStreamSource);
    notificationFunction.addEventSource(participantStreamSource);

    // API Gateway Setup
    const api = new apigateway.RestApi(this, "HikingEventApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: {
        stageName: "v1",
      },
    });

    const auth = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "ApiAuthorizer",
      {
        cognitoUserPools: [
          UserPool.fromUserPoolArn(
            this,
            "ImportedPool",
            `arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${userPoolId}`
          ),
        ],
      }
    );

    const defaultAuthorization = {
      authorizer: auth,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // API DNS

    const hostedZone = HostedZone.fromLookup(this, `WebHostedZone`, {
      domainName: domainName,
    });

    const apiCert = new Certificate(this, `APIDomainCertificate`, {
      domainName: apiDomainName,
      validation: CertificateValidation.fromDns(hostedZone),
    });

    const apiDomain = api.addDomainName("APIDomainName", {
      domainName: apiDomainName,
      certificate: apiCert,
    });

    new CnameRecord(this, `ApigatewayCnameRecord`, {
      recordName: "api",
      zone: hostedZone,
      domainName: apiDomain.domainNameAliasDomainName,
    });

    // Users
    // Users Lambda Function
    const usersFunction = new NodejsFunction(this, "UsersFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "users.handler",
      entry: path.join(__dirname, "../src/handlers/users.ts"),
      role: lambdaRole,
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
    });

    // Users API Routes
    const users = api.root.addResource("users");
    const user = users.addResource("{userId}");

    user.addMethod(
      "GET",
      new apigateway.LambdaIntegration(usersFunction),
      defaultAuthorization
    );
    user.addMethod(
      "PUT",
      new apigateway.LambdaIntegration(usersFunction),
      defaultAuthorization
    );

    // Images
    const images = api.root.addResource("images");
    images.addMethod(
      "POST",
      new apigateway.LambdaIntegration(imageProcessingFunction)
    );

    // Stack Outputs
    new cdk.CfnOutput(this, "ImagesBucketName", {
      value: imagesBucket.bucketName,
    });

    new cdk.CfnOutput(this, "ApiURL", {
      value: api.url,
    });
  }
}
