import { Amplify } from "aws-amplify";

// Values come from Amplify branch environment variables (set by the backend SAM stack).
// For local development copy .env.example to .env.local and fill in the stack outputs.
export const config = {
  region: import.meta.env.VITE_AWS_REGION,
  userPoolId: import.meta.env.VITE_USER_POOL_ID,
  userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
  apiUrl: (import.meta.env.VITE_API_URL || "").replace(/\/$/, ""),
};

export function configureAmplify() {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.userPoolClientId,
        loginWith: { email: true },
        signUpVerificationMethod: "code",
        passwordFormat: { minLength: 8, requireLowercase: true, requireUppercase: true, requireNumbers: true },
      },
    },
  });
}
