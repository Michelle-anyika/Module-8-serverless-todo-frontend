# Module 8 Serverless To-Do: Frontend

This is a React (Vite) single-page app hosted on **AWS Amplify Hosting**. It authenticates users against the **Cognito User Pool** with Amplify Auth (`aws-amplify` v6 and the `Authenticator` UI component). It calls the backend at **API Gateway → Lambda → DynamoDB** and sends the Cognito ID token in the `Authorization` header.

The backend, including the Amplify app, branch and environment variables, is defined in https://github.com/Michelle-anyika/Module-8-serverless-todo-backend.

## Features

* Email and password sign-up and sign-in. Sign-up is auto-confirmed by a Cognito PreSignUp Lambda.
* Pending, Completed and Expired tabs with counts, and a live countdown to each deadline.
* Create (with an optional custom deadline; the default is 5 minutes), edit, complete or reopen, and delete tasks.
* The task list polls every 10 seconds, so tasks that expire on the server appear without a manual refresh.

## Configuration (environment variables)

| Variable | Source |
|---|---|
| `VITE_AWS_REGION` | Amplify branch env var (SAM: `AWS::Region`) |
| `VITE_USER_POOL_ID` | Amplify branch env var (SAM: `UserPool`) |
| `VITE_USER_POOL_CLIENT_ID` | Amplify branch env var (SAM: `UserPoolClient`) |
| `VITE_API_URL` | Amplify branch env var (SAM: `TasksApi` stage URL) |

Amplify and Cognito are registered in [`src/config.js`](src/config.js), and the API client is in [`src/api.js`](src/api.js).

## Deployment

On every push to `main`, [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) does the following:

1. Assumes the Module 8 OIDC deploy role.
2. Reads the Amplify app ID from the backend stack outputs.
3. Exports the branch's `VITE_*` environment variables.
4. Builds the app.
5. Publishes the build as an Amplify deployment (`create-deployment` → upload → `start-deployment`).

The script that does steps 2–5 is [`scripts/deploy-amplify.sh`](scripts/deploy-amplify.sh).

`amplify.yml` is included, so the app can also be switched to Amplify's git-connected builds.

## Local development

```bash
cp .env.example .env.local   # fill in the backend stack outputs
npm install
npm run dev
```
