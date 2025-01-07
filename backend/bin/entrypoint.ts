#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as dotenv from "dotenv";
import { BudgetStack } from "../stacks/BudgetStack";
import { APIStack } from "../stacks/APIStack";
import { CloudfrontDNSStack } from "../stacks/CloudfrontDNSStack";
import { UserPoolStack } from "../stacks/UserPoolStack";
dotenv.config();

const app = new cdk.App();

let env = process.env.ENVIRONMENT;
let envConfig: cdk.Environment | undefined = undefined;

switch (env?.toLowerCase()) {
  case "development":
    envConfig = {
      region: "us-east-1",
      account: "796973484868",
    };
    break;
  default:
    throw new Error("process.env.ENVIRONMENT must be defined");
}

console.log(
  `Using environment: ${env} with credentials: ${JSON.stringify(envConfig)}`
);

new BudgetStack(app, "BudgetStack", {
  env: envConfig,
  budgetEmailSubscribers: ["andrew_hossack@outlook.com"],
  budgetMonthlyLimitUsd: 12,
  terminationProtection: true,
  description: "Budget and cost management resources.",
});

new CloudfrontDNSStack(app, "CloudfrontDNSStack", {
  env: envConfig,
  terminationProtection: true,
  description: "CloudFront distribution and core DNS setup.",
});

new UserPoolStack(app, "UserPoolStack", {
  env: envConfig,
  terminationProtection: true,
  description: "Cognito User Pool setup.",
});

new APIStack(app, "APIStack", {
  env: envConfig,
  terminationProtection: true,
  description: "Databases and API-related lambda functions.",
});
