#!/usr/bin/env bash
# Build the frontend with the environment variables defined on the Amplify branch
# (owned by the backend SAM stack) and publish it as an Amplify manual deployment.
set -euo pipefail

REGION="${AWS_REGION:-eu-north-1}"
STACK="${STACK_NAME:-module-8-serverless-todo}"
BRANCH="${AMPLIFY_BRANCH:-main}"

APP_ID=$(aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='AmplifyAppId'].OutputValue" --output text)
echo "Amplify app: $APP_ID / branch: $BRANCH"

# Export the branch's VITE_* environment variables for the build.
while IFS=$'\t' read -r key value; do
  [ -n "$key" ] && export "$key=$value" && echo "  $key=$value"
done < <(aws amplify get-branch --region "$REGION" --app-id "$APP_ID" --branch-name "$BRANCH" \
  --query "branch.environmentVariables" --output json \
  | python -c "import json,sys; [print(f'{k}\t{v}') for k,v in json.load(sys.stdin).items()]")

npm run build

ZIP="$(mktemp -d)/site.zip"
(cd dist && python -c "import shutil,sys; shutil.make_archive(sys.argv[1][:-4], 'zip', '.')" "$ZIP")

read -r JOB_ID UPLOAD_URL < <(aws amplify create-deployment --region "$REGION" --app-id "$APP_ID" \
  --branch-name "$BRANCH" --query "[jobId, zipUploadUrl]" --output text)
curl -sSf -X PUT -H "Content-Type: application/zip" --upload-file "$ZIP" "$UPLOAD_URL"
aws amplify start-deployment --region "$REGION" --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" >/dev/null

for _ in $(seq 1 60); do
  STATUS=$(aws amplify get-job --region "$REGION" --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" \
    --query "job.summary.status" --output text)
  echo "Deployment job $JOB_ID: $STATUS"
  case "$STATUS" in
    SUCCEED) echo "Live at https://$BRANCH.$APP_ID.amplifyapp.com"; exit 0 ;;
    FAILED|CANCELLED) exit 1 ;;
  esac
  sleep 5
done
echo "Timed out waiting for deployment" && exit 1
