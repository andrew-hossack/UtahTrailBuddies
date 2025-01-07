#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { HikingEventStack } from "../stacks/HikingEventStack";

const app = new cdk.App();

let env = process.env.ENVIRONMENT;
let envConfig: cdk.Environment | undefined = undefined;

switch (env?.toLowerCase()) {
  case "development":
    envConfig = {
      region: "us-west-1",
      account: "796973484868",
    };
    break;
  default:
    throw new Error("process.env.ENVIRONMENT must be defined");
}

console.log(
  `Using environment: ${env} with credentials: ${JSON.stringify(envConfig)}`
);

new HikingEventStack(app, "HikingEventStack", {
  budgetEmailSubscribers: ["andrew_hossack@outlook.com"],
  budgetMonthlyLimitUsd: 10,
});
