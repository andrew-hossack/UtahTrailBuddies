import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { Construct } from "constructs";
import { BudgetResources } from "../src/resources/budgetResources";

export interface HikingEventStackProps extends cdk.StackProps {
  budgetMonthlyLimitUsd: number;
  budgetEmailSubscribers: string[];
}

/**
 * Core infrastructure stack.
 */
export class HikingEventStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HikingEventStackProps) {
    super(scope, id, props);

    // S3 bucket for storing event images
    // Image processing Lambda
    const imageProcessingFunction = new lambda.Function(
      this,
      "ImageProcessingFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "imageProcessing.handler",
        code: lambda.Code.fromAsset("dist"),
        timeout: cdk.Duration.seconds(30),
        memorySize: 1024,
        environment: {
          BUCKET_NAME: process.env.IMAGES_BUCKET_NAME || "",
        },
      }
    );

    // Create S3 bucket for images
    const imagesBucket = new s3.Bucket(this, "EventImagesBucket", {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ["*"], // Restrict this to your domain in production
          allowedHeaders: ["*"],
        },
      ],
    });

    // S3 bucket for static website hosting
    const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
    });

    // CloudFront distribution for the website
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: new origins.S3StaticWebsiteOrigin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, "HikingEventUserPool", {
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        profilePicture: {
          required: false,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    // Add Google as identity provider
    const provider = new cognito.UserPoolIdentityProviderGoogle(
      this,
      "Google",
      {
        userPool: userPool,
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
          familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
          profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
        },
        scopes: ["profile", "email", "openid"],
      }
    );

    userPool.addClient("WebClient", {
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [process.env.APP_URL || "http://localhost:5173/callback"],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.GOOGLE,
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
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES, // For processing event updates
    });

    // GSI for searching events
    eventsTable.addGlobalSecondaryIndex({
      indexName: "search-index",
      partitionKey: { name: "status", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "searchField", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for date-based queries
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
      }
    );

    // API Gateway and Lambda
    const api = new apigateway.RestApi(this, "HikingEventApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

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

    // Define Lambda environment variables first
    const lambdaEnvironment = {
      USERS_TABLE: usersTable.tableName,
      EVENTS_TABLE: eventsTable.tableName,
      EVENT_PARTICIPANTS_TABLE: eventParticipantsTable.tableName,
      IMAGES_BUCKET: imagesBucket.bucketName,
      USER_POOL_ID: userPool.userPoolId,
    };

    // Create notification Lambda
    const notificationFunction = new lambda.Function(
      this,
      "NotificationFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "notifications.handler",
        code: lambda.Code.fromAsset("dist"),
        role: lambdaRole,
        environment: {
          ...lambdaEnvironment,
          FROM_EMAIL: process.env.FROM_EMAIL || "noreply@yourdomain.com",
        },
        timeout: cdk.Duration.seconds(30),
      }
    );

    // Add permissions for SES
    notificationFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"], // Restrict to specific ARN in production
      })
    );

    // Create auto-complete Lambda
    const autoCompleteFunction = new lambda.Function(
      this,
      "AutoCompleteFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "autoComplete.handler",
        code: lambda.Code.fromAsset("dist"),
        role: lambdaRole,
        environment: lambdaEnvironment,
        timeout: cdk.Duration.seconds(60),
      }
    );

    // Create EventBridge rule to trigger auto-complete function daily
    const rule = new events.Rule(this, "AutoCompleteRule", {
      schedule: events.Schedule.cron({ minute: "0", hour: "0" }), // Run at midnight UTC
    });
    rule.addTarget(new targets.LambdaFunction(autoCompleteFunction));

    // Set up DynamoDB Streams to trigger notification Lambda
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

    new BudgetResources(this, "BudgetResources", {
      budgetMonthlyLimitUsd: props.budgetMonthlyLimitUsd,
      emailSubscribers: props.budgetEmailSubscribers,
      budgetName: "Monthly Spend v2",
    });

    // Output important values
    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "WebsiteBucketName", {
      value: websiteBucket.bucketName,
    });
    new cdk.CfnOutput(this, "CloudFrontURL", {
      value: distribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, "ImagesBucketName", {
      value: imagesBucket.bucketName,
    });
    new cdk.CfnOutput(this, "ApiURL", { value: api.url });
  }
}
