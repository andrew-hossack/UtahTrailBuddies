// src/handlers/participation.ts

import { DynamoDB } from "aws-sdk";
import { APIGatewayProxyEvent } from "aws-lambda";
import { EventParticipant, APIResponse } from "../../../frontend/src/types";

const dynamodb = new DynamoDB.DocumentClient();
const EVENT_PARTICIPANTS_TABLE = process.env.EVENT_PARTICIPANTS_TABLE!;
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

// Join event
export const joinEvent = async (event: APIGatewayProxyEvent) => {
  try {
    const userId = event.requestContext.authorizer?.claims.sub;
    const { eventId } = event.pathParameters || {};

    if (!eventId || !userId) {
      return createResponse(400, { message: "Missing required parameters" });
    }

    // Check if event exists and is active
    const eventResult = await dynamodb
      .get({
        TableName: EVENTS_TABLE,
        Key: { eventId },
      })
      .promise();

    if (!eventResult.Item || eventResult.Item.status !== "active") {
      return createResponse(404, { message: "Event not found or not active" });
    }

    // Check if user is already registered
    const existingRegistration = await dynamodb
      .get({
        TableName: EVENT_PARTICIPANTS_TABLE,
        Key: { eventId, userId },
      })
      .promise();

    if (
      existingRegistration.Item &&
      existingRegistration.Item.status === "registered"
    ) {
      return createResponse(400, {
        message: "Already registered for this event",
      });
    }

    // Check if event is full
    if (eventResult.Item.maxParticipants) {
      const participantsCount = await dynamodb
        .query({
          TableName: EVENT_PARTICIPANTS_TABLE,
          KeyConditionExpression: "eventId = :eventId",
          FilterExpression: "#status = :status",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":eventId": eventId,
            ":status": "registered",
          },
        })
        .promise();

      const currentParticipantCount = participantsCount.Count ?? 0;

      if (currentParticipantCount >= eventResult.Item.maxParticipants) {
        return createResponse(400, { message: "Event is full" });
      }
    }

    const participant: EventParticipant = {
      eventId,
      userId,
      registrationDate: new Date().toISOString(),
      status: "registered",
    };

    await dynamodb
      .put({
        TableName: EVENT_PARTICIPANTS_TABLE,
        Item: participant,
      })
      .promise();

    // TODO: Send confirmation email to participant
    // This would be handled by a separate Lambda function triggered by DynamoDB Streams

    return createResponse(201, { message: "Successfully joined event" });
  } catch (error) {
    console.error("Error joining event:", error);
    return createResponse(500, { message: "Error joining event" });
  }
};

// Leave event
export const leaveEvent = async (event: APIGatewayProxyEvent) => {
  try {
    const userId = event.requestContext.authorizer?.claims.sub;
    const { eventId } = event.pathParameters || {};

    if (!eventId || !userId) {
      return createResponse(400, { message: "Missing required parameters" });
    }

    const result = await dynamodb
      .update({
        TableName: EVENT_PARTICIPANTS_TABLE,
        Key: { eventId, userId },
        UpdateExpression: "SET #status = :status",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "cancelled",
        },
        ReturnValues: "ALL_NEW",
      })
      .promise();

    if (!result.Attributes) {
      return createResponse(404, { message: "Registration not found" });
    }

    return createResponse(200, { message: "Successfully left event" });
  } catch (error) {
    console.error("Error leaving event:", error);
    return createResponse(500, { message: "Error leaving event" });
  }
};

// Get event participants (only for event organizer or joined participants)
export const getEventParticipants = async (event: APIGatewayProxyEvent) => {
  try {
    const userId = event.requestContext.authorizer?.claims.sub;
    const { eventId } = event.pathParameters || {};

    if (!eventId || !userId) {
      return createResponse(400, { message: "Missing required parameters" });
    }

    // Check if user is organizer or participant
    const eventResult = await dynamodb
      .get({
        TableName: EVENTS_TABLE,
        Key: { eventId },
      })
      .promise();

    const participantResult = await dynamodb
      .get({
        TableName: EVENT_PARTICIPANTS_TABLE,
        Key: { eventId, userId },
      })
      .promise();

    if (!eventResult.Item) {
      return createResponse(404, { message: "Event not found" });
    }

    // Only allow organizer or active participants to view participant list
    if (
      eventResult.Item.organizerId !== userId &&
      (!participantResult.Item ||
        participantResult.Item.status !== "registered")
    ) {
      return createResponse(403, {
        message: "Not authorized to view participants",
      });
    }

    const participants = await dynamodb
      .query({
        TableName: EVENT_PARTICIPANTS_TABLE,
        KeyConditionExpression: "eventId = :eventId",
        FilterExpression: "#status = :status",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":eventId": eventId,
          ":status": "registered",
        },
      })
      .promise();

    return createResponse(200, { participants: participants.Items });
  } catch (error) {
    console.error("Error getting event participants:", error);
    return createResponse(500, { message: "Error getting event participants" });
  }
};
