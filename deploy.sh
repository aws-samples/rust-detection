
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


#!/usr/bin/env bash
REGION='us-east-1'

ADMIN_EMAIL="$1"

if [ -z "$1" ]
  then
    echo "No Email Id supplied. Please specify a valid email id as a parameter. Example - ./deploy.sh EMAIL_ID"
    exit 1
fi

HEADER_TITLE="Corrosion Detection"
HEADER_LOGO=""


RAND_NUMBER=`awk -v min=0 -v max=10000000 'BEGIN{srand(); print int(min+rand()*(max-min+1))}'`
S3_DEPLOY_BUCKET="corrosion-detection-deploy-$RAND_NUMBER"
S3_DEPLOY_BUCKET_REF="s3://${S3_DEPLOY_BUCKET}"

aws s3 mb ${S3_DEPLOY_BUCKET_REF} --region ${REGION}
echo 'Created Deployment Bucket ...'

#=======================DYNAMODB ============================================

DDB_STACK_NAME="corrosion-detection-ddb-$RAND_NUMBER"

aws cloudformation deploy --template-file DDB/dynamodb-template.yaml \
    --stack-name ${DDB_STACK_NAME} \
    --region ${REGION} \
    --capabilities CAPABILITY_IAM

#===========================STEP FUNCTIONS ===================================

STEP_FUNCTION_STACK_NAME="corrosion-detection-stepfunction-$RAND_NUMBER"

aws cloudformation package \
  --template-file StepFunctions/StepFunctions_Template.yaml \
  --s3-bucket ${S3_DEPLOY_BUCKET} \
  --output-template-file StepFunctions/step-function-packaged.yaml

aws cloudformation deploy \
  --template-file StepFunctions/step-function-packaged.yaml \
  --stack-name ${STEP_FUNCTION_STACK_NAME} \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ${REGION}


endpointStateMachineArn=`aws cloudformation describe-stacks --stack-name ${STEP_FUNCTION_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`EndpointStateMachineArn\`].OutputValue' --output text`
echo "endpointStateMachineArn: ${endpointStateMachineArn}"

trainingAndEndpointStateMachineArn=`aws cloudformation describe-stacks --stack-name ${STEP_FUNCTION_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`TrainingAndEndpointStateMachineArn\`].OutputValue' --output text`
echo "trainingAndEndpointStateMachineArn: ${trainingAndEndpointStateMachineArn}"

trainingStateMachineArn=`aws cloudformation describe-stacks --stack-name ${STEP_FUNCTION_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`TrainingStateMachineArn\`].OutputValue' --output text`
echo "trainingStateMachineArn: ${trainingStateMachineArn}"

#==============================API Gateway ====================================

API_STACK_NAME="corrosion-detection-api-$RAND_NUMBER"

#Upload Deployment.zip to S3_DEPLOY_BUCKET
aws s3 cp API/deployment.zip s3://$S3_DEPLOY_BUCKET/deployment.zip
#aws s3 cp API/Inference.zip s3://$S3_DEPLOY_BUCKET/deployment.zip

aws cloudformation deploy --template-file API/sam.json \
    --stack-name ${API_STACK_NAME} \
    --region ${REGION} \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides \
    DeploymentBucket=${S3_DEPLOY_BUCKET} \
    LambdaPackagePath="deployment.zip" \
    InferenceLambdaPackagePath="deployment.zip" \
    ImagesBucketName=Test \
    TrainingEndpointArn=${trainingAndEndpointStateMachineArn} \
    TrainingArn=${trainingStateMachineArn} \
    EndpointArn=${endpointStateMachineArn}

apiHandlerName=`aws cloudformation describe-stacks --stack-name ${API_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`APIHandlerName\`].OutputValue' --output text`
echo "apiHandlerName: ${apiHandlerName}"

apiUrl=`aws cloudformation describe-stacks --stack-name ${API_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`EndpointURL\`].OutputValue' --output text`
echo "apiUrl: ${apiUrl}"

inferenceHandlerName=`aws cloudformation describe-stacks --stack-name ${API_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`InferenceHandlerName\`].OutputValue' --output text`
echo "inferenceHandlerName: ${inferenceHandlerName}"

#========================== WEB SITE ===================================================

WEBSITE_STACK_NAME="corrosion-detection-website-$RAND_NUMBER"
PROJECT_NAME=$WEBSITE_STACK_NAME


aws cloudformation package \
  --template-file WebApp/template-Dev.yaml \
  --s3-bucket ${S3_DEPLOY_BUCKET} \
  --output-template-file WebApp/Website-packaged.yaml

aws cloudformation deploy \
  --template-file WebApp/Website-packaged.yaml \
  --stack-name ${WEBSITE_STACK_NAME} \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ${REGION} \
  --parameter-overrides \
  ProjectName=${PROJECT_NAME} \
  EmailAddress=${ADMIN_EMAIL} \
  TrainingJobStateMachineArn=${trainingStateMachineArn} \
  EndpointCreationStateMachineArn=${endpointStateMachineArn} \
  TrainingAndEndpointJobStateMachineArn=${trainingAndEndpointStateMachineArn}

alias cp=cp # Ensure that we don't have alias `cp=cp -i` that will ask for prompt
cp WebApp/frontend/src/config.js WebApp/frontend/src/config.js.bak
cp WebApp/frontend/src/config.js.template WebApp/frontend/src/config.js

# Replace frontend config.js with variables from CloudFormations
userpool=`aws cloudformation describe-stacks --stack-name ${WEBSITE_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`UserPool\`].OutputValue' --output text` \
  && sed -i -e "s/\${cognito-user-pool-id}/$userpool/g" WebApp/frontend/src/config.js
echo "User Pool: ${userpool}"

identitypool=`aws cloudformation describe-stacks --stack-name ${WEBSITE_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`IdentityPool\`].OutputValue' --output text` \
  && sed -i -e "s/\${cognito-identity-pool-id}/$identitypool/g" WebApp/frontend/src/config.js
echo "Identity Pool: ${identitypool}"

userclientid=`aws cloudformation describe-stacks --stack-name ${WEBSITE_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`UserPoolClient\`].OutputValue' --output text` \
  && sed -i -e "s/\${cognito-app-client-id}/$userclientid/g" WebApp/frontend/src/config.js
echo "User Client Id: ${userclientid}"

imagesBucket=`aws cloudformation describe-stacks --stack-name ${WEBSITE_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`ImageBucket\`].OutputValue' --output text` \
  && sed -i -e "s/\${s3-bucket}/$imagesBucket/g" WebApp/frontend/src/config.js
echo "Image Bucket: ${imagesBucket}"

imagesBucketArn=`aws cloudformation describe-stacks --stack-name ${WEBSITE_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`ImageBucketArn\`].OutputValue' --output text`

cloudFrontUrl=`aws cloudformation describe-stacks --stack-name ${WEBSITE_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`CloudFrontUrl\`].OutputValue' --output text`

sed -i -e "s+\${api-url}+$apiUrl+g" WebApp/frontend/src/config.js
sed -i -e "s/\${region}/${REGION}/g" WebApp/frontend/src/config.js
sed -i -e "s/\${header-title}/${HEADER_TITLE}/g" WebApp/frontend/src/config.js
sed -i -e "s#\${header-logo}#${HEADER_LOGO}#g" WebApp/frontend/src/config.js

userpoolArn=`aws cloudformation describe-stacks --stack-name ${WEBSITE_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`UserPoolArn\`].OutputValue' --output text`
userpoolName=`aws cloudformation describe-stacks --stack-name ${WEBSITE_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`UserPoolName\`].OutputValue' --output text`

echo 'Update the Frontend Website config ...Done.'

ML_DATASET_BUCKET=`aws cloudformation describe-stacks --stack-name ${WEBSITE_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`MachineLearningDatasetBucket\`].OutputValue' --output text` \
  && sed -i -e "s/\${ml-dataset-bucket}/$ML_DATASET_BUCKET/g" WebApp/frontend/src/config.js

aws s3 sync TrainingValidationDataset/ s3://${ML_DATASET_BUCKET}


# Build & deploy Frontend
npm install --prefix WebApp/frontend/
npm run build --prefix WebApp/frontend/

S3_FE_BUCKET=`aws cloudformation describe-stacks --stack-name ${WEBSITE_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`WebSiteBucket\`].OutputValue' --output text`

aws s3 sync WebApp/frontend/build/ s3://${S3_FE_BUCKET} --acl public-read

#echo "Printing config contents ..."
echo "Your site has been deployed at: http://${S3_FE_BUCKET}.s3-website-${REGION}.amazonaws.com/"

#========================== S3 Lambda Triggers =================================

S3TRIGGERS_FUNCTION_STACK_NAME="corrosion-detection-s3Triggers-$RAND_NUMBER"

aws cloudformation package \
  --template-file s3-Lambda/template.yaml \
  --s3-bucket ${S3_DEPLOY_BUCKET} \
  --output-template-file s3-Lambda/template-packaged.yaml


aws cloudformation deploy \
  --template-file s3-Lambda/template-packaged.yaml \
  --stack-name ${S3TRIGGERS_FUNCTION_STACK_NAME} \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ${REGION} \
  --parameter-overrides \
  NotificationBucketArn=${imagesBucketArn} \
  ImageInferenceUrl=${apiUrl}

TrainingImagesUploaderArn=`aws cloudformation describe-stacks --stack-name ${S3TRIGGERS_FUNCTION_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`TrainingImagesUploaderArn\`].OutputValue' --output text`
echo "TrainingImagesUploaderArn: ${TrainingImagesUploaderArn}"

TrainingImagesUploaderName=`aws cloudformation describe-stacks --stack-name ${S3TRIGGERS_FUNCTION_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`TrainingImagesUploaderName\`].OutputValue' --output text`
echo "TrainingImagesUploaderName: ${TrainingImagesUploaderName}"

BatchInferenceLambdaArn=`aws cloudformation describe-stacks --stack-name ${S3TRIGGERS_FUNCTION_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`BatchInferenceLambdaArn\`].OutputValue' --output text`
echo "BatchInferenceLambdaArn: ${BatchInferenceLambdaArn}"

BatchInferenceLambdaName=`aws cloudformation describe-stacks --stack-name ${S3TRIGGERS_FUNCTION_STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`BatchInferenceLambdaName\`].OutputValue' --output text`
echo "BatchInferenceLambdaName: ${BatchInferenceLambdaName}"


alias cp=cp # Ensure that we don't have alias `cp=cp -i` that will ask for prompt
cp notification.json notification.json.bak
cp notification.template.json notification.json

sed -i -e "s/\${BatchInferenceLambdaArn}/$BatchInferenceLambdaArn/g" notification.json
sed -i -e "s/\${TrainingImagesUploaderArn}/$TrainingImagesUploaderArn/g" notification.json

aws s3api put-bucket-notification-configuration \
  --bucket ${imagesBucket} \
  --notification-configuration file://notification.json

#========================== Cleanup ===========================================

aws s3 rb $S3_DEPLOY_BUCKET_REF --force # Remove the temporary bucket used for CFN installation

echo "The Corrosion Detection app can be accessed at ${cloudFrontUrl}"

echo "==============FINISHED==================================="