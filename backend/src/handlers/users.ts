import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDB, CognitoIdentityServiceProvider } from "aws-sdk";

const dynamoDB = new DynamoDB.DocumentClient();
const cognito = new CognitoIdentityServiceProvider();
const usersTable = process.env.USERS_TABLE!;
const userPoolId = process.env.COGNITO_USER_POOL_ID!;

interface UserProfile {
  userId: string;
  email: string;
  name: string;
  profilePhotoUrl?: string;
  isAdminApproved?: boolean;
  createdAt?: string;
  updatedAt: string;
}

interface CognitoRequestContext {
  authorizer?: {
    claims: {
      sub: string;
      email: string;
      "cognito:groups"?: string[];
    };
  };
}

const isAdmin = (requestContext: CognitoRequestContext): boolean => {
  const groups = requestContext.authorizer?.claims["cognito:groups"] || [];
  return groups.includes("Admin");
};

const validateAccess = (
  requestContext: CognitoRequestContext,
  userId: string
): boolean => {
  // Allow if user is accessing their own data
  if (requestContext.authorizer?.claims.sub === userId) {
    return true;
  }
  // Allow if user is an admin
  if (isAdmin(requestContext)) {
    return true;
  }
  return false;
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.pathParameters?.userId;
    const requestContext = event.requestContext as CognitoRequestContext;

    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({ message: "Missing userId parameter" }),
      };
    }

    // Validate access
    if (!validateAccess(requestContext, userId)) {
      return {
        statusCode: 403,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({
          message: "Unauthorized to access this resource",
        }),
      };
    }

    // GET user profile
    if (event.httpMethod === "GET") {
      const result = await dynamoDB
        .get({
          TableName: usersTable,
          Key: { userId },
        })
        .promise();

      if (!result.Item) {
        return {
          statusCode: 404,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
          },
          body: JSON.stringify({ message: "User not found" }),
        };
      }

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify(result.Item),
      };
    }

    // UPDATE user profile
    if (event.httpMethod === "PUT") {
      if (!event.body) {
        return {
          statusCode: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
          },
          body: JSON.stringify({ message: "Missing request body" }),
        };
      }

      const updateData: Partial<UserProfile> = JSON.parse(event.body);
      const timestamp = new Date().toISOString();

      // Prepare update expression and attribute values
      const updateExpressionParts: string[] = [];
      const expressionAttributeNames: { [key: string]: string } = {};
      const expressionAttributeValues: { [key: string]: any } = {};

      Object.entries(updateData).forEach(([key, value]) => {
        if (key !== "userId" && value !== undefined) {
          // Skip userId and undefined values
          const attributeName = `#${key}`;
          const attributeValue = `:${key}`;
          updateExpressionParts.push(`${attributeName} = ${attributeValue}`);
          expressionAttributeNames[attributeName] = key;
          expressionAttributeValues[attributeValue] = value;
        }
      });

      // Always update the updatedAt timestamp
      updateExpressionParts.push("#updatedAt = :updatedAt");
      expressionAttributeNames["#updatedAt"] = "updatedAt";
      expressionAttributeValues[":updatedAt"] = timestamp;

      const updateExpression = `SET ${updateExpressionParts.join(", ")}`;

      await dynamoDB
        .update({
          TableName: usersTable,
          Key: { userId },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: "ALL_NEW",
        })
        .promise();

      // Fetch and return the updated user profile
      const updatedResult = await dynamoDB
        .get({
          TableName: usersTable,
          Key: { userId },
        })
        .promise();

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify(updatedResult.Item),
      };
    }

    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
