import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import {
  HostedZone,
  ARecord,
  RecordTarget,
  CnameRecord,
} from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { CfnLoggingConfiguration, CfnWebACL } from "aws-cdk-lib/aws-wafv2";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import { LambdaExecutionRoleNames } from "../config";
import { DomainName } from "aws-cdk-lib/aws-apigateway";
import path = require("path");

export interface CloudfrontDNSStackProps extends cdk.StackProps {}

/**
 * Core infrastructure stack containing DNS, and CloudFront distribution infrastructure.
 */
export class CloudfrontDNSStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CloudfrontDNSStackProps) {
    super(scope, id, props);

    const frontendBucketName = process.env.FRONTEND_BUCKET_NAME;
    const domainName = process.env.DOMAIN_NAME;
    const apiDomainName = process.env.API_DOMAIN;

    if (!(frontendBucketName && domainName && apiDomainName)) {
      throw Error("Missing required environment config!");
    }

    interface WafRule {
      Rule: CfnWebACL.RuleProperty;
    }
    const awsManagedRules: WafRule[] = [
      {
        Rule: {
          name: "CRSRule",
          priority: 0,
          statement: {
            managedRuleGroupStatement: {
              name: "AWSManagedRulesCommonRuleSet",
              vendorName: "AWS",
              excludedRules: [],
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "MetricForWebACLCDK-CRS",
            sampledRequestsEnabled: true,
          },
          overrideAction: {
            none: {},
          },
        },
      },
    ];

    const publicCloudfrontWebAcl = new CfnWebACL(this, `WebACL`, {
      defaultAction: { allow: {} },
      scope: "CLOUDFRONT",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "WAFMetric",
        sampledRequestsEnabled: true,
      },
      rules: awsManagedRules.map((wafRule) => wafRule.Rule),
    });

    const publicCloudfrontWebAclLogGroup = new LogGroup(
      this,
      `webACLLogGroup`,
      {
        logGroupName: "aws-waf-logs-" + id,
        retention: RetentionDays.ONE_DAY,
      }
    );

    new CfnLoggingConfiguration(this, `WAFLogging`, {
      logDestinationConfigs: [publicCloudfrontWebAclLogGroup.logGroupArn],
      resourceArn: publicCloudfrontWebAcl.attrArn,
      redactedFields: [],
    });

    const assetsBucket = new s3.Bucket(this, `WebsiteBucket`, {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      accessControl: s3.BucketAccessControl.PRIVATE,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      encryption: s3.BucketEncryption.S3_MANAGED,
      bucketName: frontendBucketName,
      lifecycleRules: [
        {
          id: "IntelligentTieringRule",
          transitions: [
            {
              transitionAfter: cdk.Duration.days(1),
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
            },
          ],
        },
      ],
    });

    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(
      this,
      `sCloudFrontOriginAccessIdentity`
    );

    assetsBucket.grantRead(cloudfrontOAI);

    // Response headers
    const responseHeaderPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      `SecurityHeadersResponseHeaderPolicy`,
      {
        comment: "Security headers response header policy",
        securityHeadersBehavior: {
          strictTransportSecurity: {
            override: true,
            accessControlMaxAge: cdk.Duration.days(2 * 365),
            includeSubdomains: true,
            preload: true,
          },
          contentTypeOptions: {
            override: true,
          },
          referrerPolicy: {
            override: true,
            referrerPolicy:
              cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          },
          xssProtection: {
            override: true,
            protection: true,
            modeBlock: true,
          },
          frameOptions: {
            override: true,
            frameOption: cloudfront.HeadersFrameOption.DENY,
          },
        },
      }
    );

    const zone = new HostedZone(this, `HostedZone`, {
      zoneName: domainName,
    });

    const certificate = new Certificate(this, `SiteCertificate`, {
      domainName: zone.zoneName,
      subjectAlternativeNames: [`*.${zone.zoneName}`],
      validation: CertificateValidation.fromDns(zone),
    });

    const distribution = new cloudfront.Distribution(
      this,
      `CloudFrontDistribution`,
      {
        certificate,
        domainNames: [domainName],
        defaultRootObject: "index.html",
        defaultBehavior: {
          origin: new origins.S3Origin(assetsBucket, {
            originAccessIdentity: cloudfrontOAI,
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy: responseHeaderPolicy,
        },
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.seconds(10),
          },
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/403.html",
            ttl: cdk.Duration.seconds(10),
          },
        ],
        webAclId: publicCloudfrontWebAcl.attrArn,
      }
    );

    new ARecord(this, `ARecord`, {
      recordName: domainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      zone: zone,
    });

    // Output important values
    new cdk.CfnOutput(this, "WebsiteBucketName", {
      value: assetsBucket.bucketName,
    });
    new cdk.CfnOutput(this, "CloudFrontURL", {
      value: distribution.distributionDomainName,
    });
  }
}
