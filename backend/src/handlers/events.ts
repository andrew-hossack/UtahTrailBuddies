// src/handlers/events.ts

import { DynamoDB } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Event, APIResponse } from "../../../frontend/src/types";

const dynamodb = new DynamoDB.DocumentClient();
const EVENTS_TABLE = process.env.EVENTS_TABLE!;

// Helper function to create API response
const createResponse = <T>(statusCode: number, body: T): APIResponse<T> => ({
  statusCode,
  body: JSON.stringify(body),
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true,
  },
});

// Create new event
export const createEvent = async (event: APIGatewayProxyEvent) => {
  try {
    const userId = event.requestContext.authorizer?.claims.sub;
    if (!userId) {
      return createResponse(401, { message: "Unauthorized" });
    }

    const body = JSON.parse(event.body || "{}") as Omit<
      Event,
      | "eventId"
      | "organizerId"
      | "dateCreated"
      | "lastUpdated"
      | "status"
      | "searchField"
    >;

    // Validate event date is not in the past
    if (new Date(body.eventDate) < new Date()) {
      return createResponse(400, {
        message: "Event date cannot be in the past",
      });
    }

    const newEvent: Event = {
      ...body,
      eventId: uuidv4(),
      organizerId: userId,
      status: "active",
      searchField: `${body.title.toLowerCase()} ${body.description.toLowerCase()}`,
      dateCreated: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    await dynamodb
      .put({
        TableName: EVENTS_TABLE,
        Item: newEvent,
      })
      .promise();

    return createResponse(201, newEvent);
  } catch (error) {
    console.error("Error creating event:", error);
    return createResponse(500, { message: "Error creating event" });
  }
};

// Get event by ID
export const getEvent = async (event: APIGatewayProxyEvent) => {
  try {
    const { eventId } = event.pathParameters || {};
    if (!eventId) {
      return createResponse(400, { message: "Event ID is required" });
    }

    const result = await dynamodb
      .get({
        TableName: EVENTS_TABLE,
        Key: { eventId },
      })
      .promise();

    if (!result.Item) {
      return createResponse(404, { message: "Event not found" });
    }

    return createResponse(200, result.Item as Event);
  } catch (error) {
    console.error("Error getting event:", error);
    return createResponse(500, { message: "Error retrieving event" });
  }
};

// List events with pagination and filters
export const listEvents = async (event: APIGatewayProxyEvent) => {
  try {
    const { startDate, endDate, category, searchTerm } =
      event.queryStringParameters || {};
    const lastEvaluatedKey = event.queryStringParameters?.lastEvaluatedKey;

    let params: DynamoDB.DocumentClient.QueryInput = {
      TableName: EVENTS_TABLE,
      IndexName: "date-index",
      KeyConditionExpression: "#status = :status",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": "active",
      },
      Limit: 20,
    };

    if (startDate && endDate) {
      params.KeyConditionExpression +=
        " AND eventDate BETWEEN :startDate AND :endDate";
      params.ExpressionAttributeValues = {
        ...params.ExpressionAttributeValues,
        ":startDate": startDate,
        ":endDate": endDate,
      };
    }

    if (searchTerm) {
      params.FilterExpression = "contains(searchField, :searchTerm)";
      params.ExpressionAttributeValues = {
        ...params.ExpressionAttributeValues,
        ":searchTerm": searchTerm.toLowerCase(),
      };
    }

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(lastEvaluatedKey);
    }

    const result = await dynamodb.query(params).promise();

    return createResponse(200, {
      events: result.Items,
      lastEvaluatedKey: result.LastEvaluatedKey
        ? JSON.stringify(result.LastEvaluatedKey)
        : null,
    });
  } catch (error) {
    console.error("Error listing events:", error);
    return createResponse(500, { message: "Error listing events" });
  }
};

// Update event
export const updateEvent = async (event: APIGatewayProxyEvent) => {
  try {
    const userId = event.requestContext.authorizer?.claims.sub;
    const { eventId } = event.pathParameters || {};
    if (!eventId || !userId) {
      return createResponse(400, { message: "Missing required parameters" });
    }

    const body = JSON.parse(event.body || "{}");

    // Check if user is organizer or admin
    const existingEvent = await dynamodb
      .get({
        TableName: EVENTS_TABLE,
        Key: { eventId },
      })
      .promise();

    if (!existingEvent.Item) {
      return createResponse(404, { message: "Event not found" });
    }

    if (
      existingEvent.Item.organizerId !== userId &&
      !event.requestContext.authorizer?.claims.isAdmin
    ) {
      return createResponse(403, {
        message: "Unauthorized to update this event",
      });
    }

    const updateExpression =
      "SET title = :title, description = :description, categories = :categories, location = :location, eventDate = :eventDate, eventTime = :eventTime, maxParticipants = :maxParticipants, lastUpdated = :lastUpdated, searchField = :searchField";

    await dynamodb
      .update({
        TableName: EVENTS_TABLE,
        Key: { eventId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: {
          ":title": body.title,
          ":description": body.description,
          ":categories": body.categories,
          ":location": body.location,
          ":eventDate": body.eventDate,
          ":eventTime": body.eventTime,
          ":maxParticipants": body.maxParticipants,
          ":lastUpdated": new Date().toISOString(),
          ":searchField": `${body.title.toLowerCase()} ${body.description.toLowerCase()}`,
        },
        ReturnValues: "ALL_NEW",
      })
      .promise();

    return createResponse(200, { message: "Event updated successfully" });
  } catch (error) {
    console.error("Error updating event:", error);
    return createResponse(500, { message: "Error updating event" });
  }
};

// Cancel event
export const cancelEvent = async (event: APIGatewayProxyEvent) => {
  try {
    const userId = event.requestContext.authorizer?.claims.sub;
    const { eventId } = event.pathParameters || {};
    if (!eventId || !userId) {
      return createResponse(400, { message: "Missing required parameters" });
    }

    // Check if user is organizer or admin
    const existingEvent = await dynamodb
      .get({
        TableName: EVENTS_TABLE,
        Key: { eventId },
      })
      .promise();

    if (!existingEvent.Item) {
      return createResponse(404, { message: "Event not found" });
    }

    if (
      existingEvent.Item.organizerId !== userId &&
      !event.requestContext.authorizer?.claims.isAdmin
    ) {
      return createResponse(403, {
        message: "Unauthorized to cancel this event",
      });
    }

    await dynamodb
      .update({
        TableName: EVENTS_TABLE,
        Key: { eventId },
        UpdateExpression: "SET #status = :status, lastUpdated = :lastUpdated",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "cancelled",
          ":lastUpdated": new Date().toISOString(),
        },
      })
      .promise();

    // TODO: Trigger notification to all participants

    return createResponse(200, { message: "Event cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling event:", error);
    return createResponse(500, { message: "Error cancelling event" });
  }
};
