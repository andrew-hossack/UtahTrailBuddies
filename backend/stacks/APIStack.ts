import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import path = require("path");

export interface APIStackProps extends cdk.StackProps {}

export class APIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: APIStackProps) {
    super(scope, id, props);
    const imagesBucketName = process.env.IMAGES_BUCKET_NAME;

    if (!imagesBucketName) {
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
  }
}
