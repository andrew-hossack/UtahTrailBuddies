import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import path = require("path");

export interface UserPoolStackProps extends cdk.StackProps {}

/**
 * Database and lambda setup.
 */
export class UserPoolStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: UserPoolStackProps) {
    super(scope, id, props);
    const domainName = process.env.DOMAIN_NAME;
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!(domainName && googleClientSecret && googleClientId)) {
      throw Error("Missing required environment config!");
    }

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, "HikingEventUserPool", {
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      customAttributes: {
        isAdminApproved: new cognito.StringAttribute({ mutable: true }),
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

    // // Add Google as identity provider
    const provider = new cognito.UserPoolIdentityProviderGoogle(
      this,
      "Google",
      {
        userPool: userPool,
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
          familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
          profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
          emailVerified: cognito.ProviderAttribute.GOOGLE_EMAIL_VERIFIED,
        },
        scopes: ["profile", "openid", "email"],
      }
    );

    const userPoolDomain = userPool.addDomain("AuthDomain", {
      cognitoDomain: {
        domainPrefix: domainName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase(),
      },
    });

    const client = userPool.addClient("WebClient", {
      oAuth: {
        scopes: [
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
        ],
        callbackUrls: [
          `https://${domainName}`,
          "http://localhost:3000/callback",
        ],
        logoutUrls: [`https://${domainName}`, "http://localhost:3000"],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.GOOGLE,
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    });
    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
  }
}
