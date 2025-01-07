/**
 * Table ARNs of DynamoDB tables.
 * Please use this as source-of-truth reference for API service definitions.
 */
export enum TableArns {
  USER_DATA_TABLE = "arn:aws:dynamodb:us-east-1:381491857943:table/UserDataTable",
  REGISTERED_BEACONS_TABLE = "arn:aws:dynamodb:us-east-1:381491857943:table/RegisteredBeaconsTable",
  JUMP_DATA_TABLE = "arn:aws:dynamodb:us-east-1:381491857943:table/JumpDataTable",
  BEACON_REGISTRATION_REQUESTS_TABLE = "arn:aws:dynamodb:us-east-1:381491857943:table/BeaconRegistrationRequestsTable",
  SESSIONS_TABLE_ARN = "arn:aws:dynamodb:us-east-1:381491857943:table/JumpSessionsTable",
  UNSUBSCRIBE_TABLE_ARN = "arn:aws:dynamodb:us-east-1:381491857943:table/UnsubscribedEmailsTable",
}

export enum Config {
  IOT_ENDPOINT_ADDRESS = "https://iot.flyparatag.com",
  COGNITO_IDENTITY_POOL_ID = "us-east-1:c1bf38e4-53bc-4bf2-a6b0-a653e46adf93",
  COGNITO_USER_POOL_ID = "us-east-1_HYKr15f6b",
}

/**
 * Base API paths to use for api content (e.g. api.example.com/base-path).
 */
export enum ApiBasePaths {
  DATA = "data",
  CONTACT = "contact",
  CREDENTIAL = "credential",
  USER = "user",
  BEACON = "beacon",
  SESSIONS = "sessions",
}

/**
 * Role names used between common api stack and task definitions.
 */
export enum LambdaExecutionRoleNames {
  CREDENTIAL_SERVICE_ROLE = "CredentialServiceLambdaExecutionRole",
  APK_DOWNLOAD_FUNCTION_ROLE = "ApkDownloadFunctionRole",
  SESSIONS_SERVICE_ROLE = "SessionsServiceLambdaExecutionRole",
  SUPPORT_SERVICE_ROLE = "SESLambdaExecutionRole",
  BEACON_SERVICE_ROLE = "BeaconServiceLambdaExecutionRole",
  USER_SERVICE_ROLE = "UserServiceLambdaExecutionRole",
  JUMP_SERVICE_ROLE = "JumpServiceLambdaExecutionRole",
  PUBLIC_JUMP_SERVICE_ROLE = "PublicJumpServiceLambdaExecutionRole",
  VPC_ACCESS_ROLE = "VpcCognitoAccessLambdaExecutionRole",
  JUMP_STATUS_NOTIFICATION_HANDLER_ROLE = "JumpStatusNotificationHandlerRole",
  EMAIL_UNSUBSCRIBE_TABLE_ROLE = "EmailUnsubscribeTableRole",
}
