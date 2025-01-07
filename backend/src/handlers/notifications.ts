// src/handlers/notifications.ts

import { DynamoDB, SES } from "aws-sdk";
import { DynamoDBStreamEvent, DynamoDBRecord } from "aws-lambda";
import { Event, EventParticipant } from "../../../frontend/src/types";

const ses = new SES();
const dynamodb = new DynamoDB.DocumentClient();
const EVENTS_TABLE = process.env.EVENTS_TABLE!;
const EVENT_PARTICIPANTS_TABLE = process.env.EVENT_PARTICIPANTS_TABLE!;
const USERS_TABLE = process.env.USERS_TABLE!;
const FROM_EMAIL = process.env.FROM_EMAIL!;

interface EmailTemplate {
  subject: string;
  body: string;
}

const createEventUpdateEmail = (event: Event): EmailTemplate => ({
  subject: `Event Update: ${event.title}`,
  body: `
    The event "${event.title}" has been updated.
    
    Date: ${new Date(event.eventDate).toLocaleDateString()}
    Time: ${event.eventTime}
    Location: ${event.location}
    
    Description:
    ${event.description}
    
    You can view the full event details by logging into your account.
  `,
});

const createEventCancellationEmail = (event: Event): EmailTemplate => ({
  subject: `Event Cancelled: ${event.title}`,
  body: `
    Unfortunately, the event "${event.title}" scheduled for ${new Date(
    event.eventDate
  ).toLocaleDateString()} 
    has been cancelled.
    
    If you have any questions, please contact the event organizer.
  `,
});

const createRegistrationConfirmationEmail = (event: Event): EmailTemplate => ({
  subject: `Registration Confirmed: ${event.title}`,
  body: `
    You're registered for "${event.title}"!
    
    Event Details:
    Date: ${new Date(event.eventDate).toLocaleDateString()}
    Time: ${event.eventTime}
    Location: ${event.location}
    
    Important Information:
    ${event.description}
    
    You can view the full event details and participant list by logging into your account.
  `,
});

// Helper to get user email
const getUserEmail = async (userId: string): Promise<string> => {
  const user = await dynamodb
    .get({
      TableName: USERS_TABLE,
      Key: { userId },
    })
    .promise();

  return user.Item?.email;
};

// Helper to get event participants
const getEventParticipants = async (eventId: string): Promise<string[]> => {
  const result = await dynamodb
    .query({
      TableName: EVENT_PARTICIPANTS_TABLE,
      KeyConditionExpression: "eventId = :eventId",
      FilterExpression: "#status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":eventId": eventId,
        ":status": "registered",
      },
    })
    .promise();

  return result.Items?.map((item) => item.userId) || [];
};

// Helper to send email
const sendEmail = async (toEmail: string, template: EmailTemplate) => {
  const params = {
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Subject: {
        Data: template.subject,
      },
      Body: {
        Text: {
          Data: template.body,
        },
      },
    },
  };

  await ses.sendEmail(params).promise();
};

// Process DynamoDB Stream records
const processRecord = async (record: DynamoDBRecord) => {
  // Skip if not a modification
  if (!record.dynamodb?.NewImage || !record.dynamodb?.OldImage) {
    return;
  }

  const newImage = DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
  const oldImage = DynamoDB.Converter.unmarshall(record.dynamodb.OldImage);

  // Handle Event updates
  if (record.eventName === "MODIFY" && "eventId" in newImage) {
    const event = newImage as Event;

    // Handle event cancellation
    if (oldImage.status === "active" && event.status === "cancelled") {
      const participants = await getEventParticipants(event.eventId);

      for (const userId of participants) {
        const userEmail = await getUserEmail(userId);
        if (userEmail) {
          await sendEmail(userEmail, createEventCancellationEmail(event));
        }
      }
    }
    // Handle event updates
    else if (
      event.status === "active" &&
      (oldImage.eventDate !== event.eventDate ||
        oldImage.eventTime !== event.eventTime ||
        oldImage.location !== event.location ||
        oldImage.description !== event.description)
    ) {
      const participants = await getEventParticipants(event.eventId);

      for (const userId of participants) {
        const userEmail = await getUserEmail(userId);
        if (userEmail) {
          await sendEmail(userEmail, createEventUpdateEmail(event));
        }
      }
    }
  }
  // Handle new registrations
  else if (record.eventName === "INSERT" && "eventId" in newImage) {
    const registration = newImage as EventParticipant;
    if (registration.status === "registered") {
      const event = await dynamodb
        .get({
          TableName: EVENTS_TABLE,
          Key: { eventId: registration.eventId },
        })
        .promise();

      if (event.Item) {
        const userEmail = await getUserEmail(registration.userId);
        if (userEmail) {
          await sendEmail(
            userEmail,
            createRegistrationConfirmationEmail(event.Item as Event)
          );
        }
      }
    }
  }
};

// Main handler function
export const handler = async (event: DynamoDBStreamEvent) => {
  try {
    await Promise.all(event.Records.map(processRecord));
  } catch (error) {
    console.error("Error processing notifications:", error);
    throw error;
  }
};
