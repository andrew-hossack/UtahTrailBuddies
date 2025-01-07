# Utah Hiking Events Platform

A platform for organizing and joining hiking events in Utah.

## Project Structure

```
.
├── frontend/          # React frontend application
├── backend/           # AWS CDK infrastructure and Lambda functions
└── .github/
    └── workflows/     # GitHub Actions CI/CD workflows
```

## Development Setup

### Prerequisites

- Node.js 18+
- AWS CLI configured with appropriate credentials
- GitHub account with repository secrets configured

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Backend Setup

```bash
cd backend
npm install
npm run build
npm run cdk deploy
```

## Required GitHub Secrets

The following secrets need to be configured in your GitHub repository settings:

### AWS Configuration
- `AWS_ACCESS_KEY_ID`: AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY`: AWS secret key for deployment
- `AWS_REGION`: AWS region (e.g., us-west-2)

### Frontend Environment
- `VITE_API_URL`: API Gateway URL
- `VITE_AWS_REGION`: Cognito region
- `VITE_COGNITO_USER_POOL_ID`: Cognito user pool ID
- `VITE_COGNITO_CLIENT_ID`: Cognito client ID
- `VITE_CDN_URL`: CloudFront distribution URL
- `S3_BUCKET`: S3 bucket name for frontend hosting
- `CLOUDFRONT_DISTRIBUTION_ID`: CloudFront distribution ID

### Backend Environment
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `FROM_EMAIL`: Email address for system notifications
- `APP_URL`: Frontend application URL

## CI/CD Workflows

### Frontend Pipeline
- Triggers on changes to `frontend/` directory
- Runs type checking and linting
- Builds the application
- Deploys to S3 and invalidates CloudFront cache (main branch only)

### Backend Pipeline
- Triggers on changes to `backend/` directory
- Runs type checking, linting, and tests
- Builds Lambda functions
- Deploys CDK stack (main branch only)

## Local Development

1. Clone the repository
2. Create a `.env` file in both frontend and backend directories using the provided `.env.example` templates
3. Install dependencies in both directories
4. Start the frontend development server
5. Deploy the backend stack to your AWS account

## Deployment

The application is automatically deployed when changes are pushed to the main branch:

1. Frontend is deployed to S3 and served through CloudFront
2. Backend is deployed using AWS CDK to create/update the required infrastructure

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request
4. CI will automatically run checks on your PR
5. After approval and merge, CD will deploy your changes

## Infrastructure

The application uses the following AWS services:
- S3 for frontend hosting and image storage
- CloudFront for content delivery
- Cognito for authentication
- API Gateway and Lambda for the backend API
- DynamoDB for data storage
- SES for email notifications