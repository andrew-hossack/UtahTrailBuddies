// src/handlers/autoComplete.ts

import { DynamoDB } from "aws-sdk";

const dynamodb = new DynamoDB.DocumentClient();
const EVENTS_TABLE = process.env.EVENTS_TABLE!;

export const handler = async () => {
  try {
    const now = new Date().toISOString();

    // Query active events that are in the past
    const params: DynamoDB.DocumentClient.QueryInput = {
      TableName: EVENTS_TABLE,
      IndexName: "date-index",
      KeyConditionExpression: "#status = :status AND eventDate < :now",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": "active",
        ":now": now,
      },
    };

    let lastEvaluatedKey: DynamoDB.DocumentClient.Key | undefined;

    do {
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await dynamodb.query(params).promise();

      // Update each past event to completed status
      if (result.Items && result.Items.length > 0) {
        const updates = result.Items.map((event) =>
          dynamodb
            .update({
              TableName: EVENTS_TABLE,
              Key: {
                eventId: event.eventId,
                organizerId: event.organizerId,
              },
              UpdateExpression:
                "SET #status = :status, lastUpdated = :lastUpdated",
              ExpressionAttributeNames: {
                "#status": "status",
              },
              ExpressionAttributeValues: {
                ":status": "completed",
                ":lastUpdated": now,
              },
            })
            .promise()
        );

        await Promise.all(updates);
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return {
      statusCode: 200,
      body: "Successfully processed past events",
    };
  } catch (error) {
    console.error("Error auto-completing past events:", error);
    throw error;
  }
};
