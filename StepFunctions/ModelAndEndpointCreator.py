# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3
import time
import logging
import json
import os

DOCKER_IMAGE = os.environ['DOCKER_IMAGE']
EXECUTION_ROLE_ARN = os.environ['EXECUTION_ROLE_ARN']

sagemaker_client = boto3.client('sagemaker')

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)


# --- Main handler ---
def lambda_handler(event, context):
    logger.debug("Raw Event: {}".format(json.dumps(event)))
    job_name = event['Step1']['TrainingJobName']
    instanceType = event['EndpointInstanceType']
    initialInstanceCount = event['EndpointInitialInstanceCount']

    endpoint_config_name = 'corrosion-detection-endpointconfig-' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime())
    logger.debug(endpoint_config_name)

    model_name = job_name
    logger.debug("job name {}".format(model_name))

    info = sagemaker_client.describe_training_job(TrainingJobName=job_name)
    model_data = info['ModelArtifacts']['S3ModelArtifacts']

    primary_container = {
        'Image': DOCKER_IMAGE,
        'ModelDataUrl': model_data
    }

    try:
        create_model_response = sagemaker_client.create_model(
            ModelName=model_name,
            ExecutionRoleArn=EXECUTION_ROLE_ARN,
            PrimaryContainer=primary_container)

        logger.debug(create_model_response['ModelArn'])
    except Exception as e:
        logger.debug('Ignoring error due to already existing model.')
        logger.debug(e)

    create_endpoint_config_response = sagemaker_client.create_endpoint_config(
        EndpointConfigName = endpoint_config_name,
        ProductionVariants=[{
            'InstanceType':instanceType,
            'InitialInstanceCount':initialInstanceCount,
            'ModelName': job_name,
            'VariantName':'AllTraffic'}])

    logger.debug("Endpoint Config Arn: " + create_endpoint_config_response['EndpointConfigArn'])

    endpoint_name = 'corrosion-detection-endpoint-' + time.strftime("%Y-%m-%d-%H-%M-%S", time.gmtime())
    logger.debug(endpoint_name)
    create_endpoint_response = sagemaker_client.create_endpoint(
        EndpointName=endpoint_name,
        EndpointConfigName=endpoint_config_name)
    logger.debug(create_endpoint_response['EndpointArn'])

    return {
        "EndpointName" : endpoint_name
    }

def check_handler(event, context):
    logger.debug("Raw Event: {}".format(json.dumps(event)))
    endpoint_name = event['endpointCreationResult']['EndpointName']

    resp = sagemaker_client.describe_endpoint(EndpointName=endpoint_name)
    status = resp['EndpointStatus']
    logger.debug("Status: " + status)

    return {
        "EndpointStatus": status
    }

