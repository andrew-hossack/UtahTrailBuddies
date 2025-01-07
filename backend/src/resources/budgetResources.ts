import { RemovalPolicy } from "aws-cdk-lib";
import { CfnBudget } from "aws-cdk-lib/aws-budgets";
import { Construct } from "constructs";

interface BudgetResourcesProps {
  emailSubscribers: string[];
  budgetMonthlyLimitUsd: number;
  /**
   * Name of budget (optional).
   * Default: 'Monthly Spend'
   */
  budgetName?: string;
}

export class BudgetResources extends Construct {
  constructor(scope: Construct, id: string, props: BudgetResourcesProps) {
    super(scope, id);
    const budget = new CfnBudget(this, `${id}-Budget`, {
      budget: {
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: {
          amount: props.budgetMonthlyLimitUsd,
          unit: "USD",
        },
        budgetName: props.budgetName ?? "Monthly Spend",
        costTypes: {
          includeCredit: false,
          includeRefund: false,
        },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            comparisonOperator: "GREATER_THAN",
            notificationType: "ACTUAL",
            threshold: 85,
            thresholdType: "PERCENTAGE",
          },
          subscribers: this.generateSubscribersList(props.emailSubscribers),
        },
        {
          notification: {
            comparisonOperator: "GREATER_THAN",
            notificationType: "FORECASTED",
            threshold: 100,
            thresholdType: "PERCENTAGE",
          },
          subscribers: this.generateSubscribersList(props.emailSubscribers),
        },
        {
          notification: {
            comparisonOperator: "GREATER_THAN",
            notificationType: "ACTUAL",
            threshold: 100,
            thresholdType: "PERCENTAGE",
          },
          subscribers: this.generateSubscribersList(props.emailSubscribers),
        },
      ],
    });
    budget.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }

  generateSubscribersList = (emailSubscribers: string[]) => {
    return emailSubscribers.flatMap((subscriberAddress) => {
      return {
        address: subscriberAddress,
        subscriptionType: "EMAIL",
      };
    });
  };
}
