import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { BudgetResources } from "../src/resources/budgetResources";
import path = require("path");

export interface BudgetStackProps extends cdk.StackProps {
  budgetMonthlyLimitUsd: number;
  budgetEmailSubscribers: string[];
}

/**
 * Budget resources.
 */
export class BudgetStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BudgetStackProps) {
    super(scope, id, props);

    new BudgetResources(this, "BudgetResources", {
      budgetMonthlyLimitUsd: props.budgetMonthlyLimitUsd,
      emailSubscribers: props.budgetEmailSubscribers,
      budgetName: "Monthly Spend v2",
    });
  }
}
