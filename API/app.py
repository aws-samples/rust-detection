# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

from chalice import Chalice
from chalice import BadRequestError
import time
import json
import uuid
import boto3
import base64
import os
from boto3.dynamodb.conditions import Key, Attr
import inference
from chalice import CognitoUserPoolAuthorizer

IMAGE_S3_BUCKET = os.environ['CORROSION_IMAGE_S3_BUCKET']

COGNITO_USER_POOL_ARN = os.environ['COGNITO_USER_POOL_ARN']
COGNITO_USER_POOL_NAME = os.environ['COGNITO_USER_POOL_NAME']

app_authorizer = CognitoUserPoolAuthorizer(COGNITO_USER_POOL_NAME, provider_arns=[COGNITO_USER_POOL_ARN])

BATCH_INFO = 'ImageBatchInfo'
BATCH_DETAILS_INFO = 'ImageBatchDetailsInfo'

sfn_client = boto3.client('stepfunctions')
sagemaker_client = boto3.client('sagemaker')
ssm = boto3.client('ssm')
dynamodb = boto3.resource('dynamodb')
app = Chalice(app_name='CorrosionDetection')
app.debug = True

TRAINING_JOB_STATE_MACHINE_ARN = ssm.get_parameter(Name='CORROSION_TRAINING_JOB_STATE_MACHINE_ARN', WithDecryption=False)['Parameter']['Value'] #os.environ['CORROSION_TRAINING_JOB_STATE_MACHINE_ARN']
ENDPOINT_JOB_STATE_MACHINE_ARN = ssm.get_parameter(Name='CORROSION_ENDPOINT_JOB_STATE_MACHINE_ARN', WithDecryption=False)['Parameter']['Value'] #os.environ['CORROSION_ENDPOINT_JOB_STATE_MACHINE_ARN']
MODEL_ENDPOINT_JOB_STATE_MACHINE_ARN = ssm.get_parameter(Name='MODEL_ENDPOINT_JOB_STATE_MACHINE_ARN', WithDecryption=False)['Parameter']['Value']#os.environ['MODEL_ENDPOINT_JOB_STATE_MACHINE_ARN']

print(TRAINING_JOB_STATE_MACHINE_ARN)
print(ENDPOINT_JOB_STATE_MACHINE_ARN)
print(MODEL_ENDPOINT_JOB_STATE_MACHINE_ARN)


@app.route('/detect', methods=['PUT'], cors=True, authorizer=app_authorizer)
def analyzeImage():
    body = app.current_request.json_body
    return inference.init(body)


def put_s3(image,  imageformat):
    s3 = boto3.resource('s3')

    uu_id = str(uuid.uuid4())
    s3.Bucket(IMAGE_S3_BUCKET).put_object(
        ACL='private',
        Key='public/inference/{}.{}'.format(uu_id, imageformat),
        Body=image
    )

    uu_id1 = str(uuid.uuid4())
    s3.Bucket(IMAGE_S3_BUCKET).put_object(
        ACL='private',
        Key='public/inference/{}.{}'.format(uu_id1, imageformat),
        Body=image
    )

    return {
            'key1': 'inference/{}.{}'.format(uu_id, imageformat),
            'key2': 'inference/{}.{}'.format(uu_id1, imageformat)
    }


def put_s3ForBatch(image, BatchId, BatchName, filename):

    s3 = boto3.resource('s3')
    s3.Bucket(IMAGE_S3_BUCKET).put_object(
        ACL='private',
        Key='public/inference/{}_{}/Gen_{}'.format(BatchId, BatchName, filename),
        Body=image
    )

    s3.Bucket(IMAGE_S3_BUCKET).put_object(
        ACL='private',
        Key='public/inference/{}_{}/Org_{}'.format(BatchId, BatchName, filename),
        Body=image
    )

    return {
            'key1': 'inference/{}_{}/Gen_{}'.format(BatchId, BatchName, filename),
            'key2': 'inference/{}_{}/Org_{}'.format(BatchId, BatchName, filename)
        }


@app.route('/Model', methods=['POST'], cors=True, authorizer=app_authorizer)
def train():
    body = app.current_request.json_body
    print(body)

    try:
        execution_response = sfn_client.start_execution(
            stateMachineArn=TRAINING_JOB_STATE_MACHINE_ARN,
            input=json.dumps(body)
        )
        execution_arn = execution_response.get('executionArn')
        print("Started Step Function Workflow execution. Execution_arn = {}".format(execution_arn))

    except Exception as e:
        print("Error when starting Step function workflow = {}".format(e))
        return {
            "statusCode": 500
        }

    return {
        "statusCode": 200
    }


@app.route('/Endpoint', methods=['POST'], cors=True, authorizer=app_authorizer)
def createEndpoint():
    body = app.current_request.json_body
    print(body)

    try:
        execution_response = sfn_client.start_execution(
            stateMachineArn=ENDPOINT_JOB_STATE_MACHINE_ARN,
            input=json.dumps(body)
        )
        execution_arn = execution_response.get('executionArn')
        print("Started Step Function Workflow execution. Execution_arn = {}".format(execution_arn))

    except Exception as e:
        print("Error when starting Step function workflow = {}".format(e))
        return {
            "statusCode": 500
        }

    return {
        "statusCode": 200
    }

@app.route('/Endpoint', methods=['GET'], cors=True, authorizer=app_authorizer)
def getCurrentEndpoint():

    try:
        currEndpoint = ssm.get_parameter(Name='XGB_ENDPOINT', WithDecryption=False)
        currentEndpoint = currEndpoint['Parameter']['Value']

        prevEndpoint = ssm.get_parameter(Name='PREVIOUS_SAGEMAKER_SSD_ENDPOINT', WithDecryption=False)
        previousEndpoint = prevEndpoint['Parameter']['Value']

    except Exception as e:
        print("Parameter not found ".format(e))
        return {
            "statusCode": 500
        }

    return {
        "statusCode": 200,
        "CurrentEndpoint": currentEndpoint,
        "PreviousEndpoint": previousEndpoint
    }

@app.route('/Endpoint', methods=['PUT'], cors=True, authorizer=app_authorizer)
def updateCurrentEndpoint():
    body = app.current_request.json_body
    print(body)

    try:
        
        current = ssm.get_parameter(Name='XGB_ENDPOINT', WithDecryption=False)
        currentEndpoint = current['Parameter']['Value']

        ssm.put_parameter(Name='XGB_ENDPOINT',
                                    Value=body['NewEndpoint'],
                                    Type='String', Overwrite=True)

        ssm.put_parameter(Name='PREVIOUS_SAGEMAKER_SSD_ENDPOINT',
                          Value=currentEndpoint,
                          Type='String', Overwrite=True)

    except Exception as e:
        print("Error when updateCurrentEndpoint = {}".format(e))
        return {
            "statusCode": 500
        }

    return {
        "statusCode": 200
    }

@app.route('/ModelAndEndpoint', methods=['POST'], cors=True, authorizer=app_authorizer)
def createModelEndpoint():
    body = app.current_request.json_body
    print(body)

    try:
        execution_response = sfn_client.start_execution(
            stateMachineArn=MODEL_ENDPOINT_JOB_STATE_MACHINE_ARN,
            input=json.dumps(body)
        )
        execution_arn = execution_response.get('executionArn')
        print("Started Step Function Workflow execution. Execution_arn = {}".format(execution_arn))

    except Exception as e:
        print("Error when starting Step function workflow = {}".format(e))
        return {
            "statusCode": 500
        }

    return {
        "statusCode": 200
    }


@app.route('/trainingjob', methods=['GET'], cors=True, authorizer=app_authorizer)
def getTrainingJobs():
    response = sagemaker_client.list_training_jobs(
        MaxResults=10,
        SortBy='CreationTime',
        SortOrder='Descending'
    )

    responseObj = []

    for jobSummary in response.get('TrainingJobSummaries'):
        trainingObj = {}
        trainingObj['JobName'] = jobSummary['TrainingJobName']
        trainingObj['CreationTime'] = jobSummary.get('CreationTime').strftime('%b %d,%Y %H:%M') + " UTC"
        trainingObj['Status'] = jobSummary['TrainingJobStatus']
        responseObj.append(trainingObj)

    #print(json.dumps(trainingObj))
    return responseObj


@app.route('/endpointList', methods=['GET'], cors=True, authorizer=app_authorizer)
def getEndpointList():
    response = sagemaker_client.list_endpoints(
        MaxResults=10,
        SortBy='CreationTime',
        SortOrder='Descending'
    )

    responseObj = []
    for endpoint in response.get('Endpoints'):
        endpointObj = {}
        endpointObj['EndpointName'] = endpoint['EndpointName']
        endpointObj['CreationTime'] = endpoint.get('CreationTime').strftime('%b %d,%Y %H:%M') + " UTC"
        endpointObj['Status'] = endpoint['EndpointStatus']
        responseObj.append(endpointObj)

    return responseObj


@app.route('/batch', methods=['GET'], cors=True, authorizer=app_authorizer)
def getBatchInfo():

    table = dynamodb.Table(BATCH_INFO)
    ke = Key('Status').eq('OK')

    response = table.query(
        IndexName='GSI-ImageBatchInfo',
        KeyConditionExpression=ke,
        ScanIndexForward=False,
        Limit=30
    )

    return {'Items': response['Items'], 'Count': response['Count']}

@app.route('/batch/{Id}', methods=['GET'], cors=True, authorizer=app_authorizer)
def getBatchDetails(Id):

    table = dynamodb.Table(BATCH_DETAILS_INFO)
    ke = Key('BatchId').eq(Id)

    response = table.query(
        KeyConditionExpression=ke
    )

    return {'Items': response['Items'], 'Count': response['Count'] }


@app.route('/trainingImages', methods=['GET'], cors=True, authorizer=app_authorizer)
def getNoOfTrainingImages():

    try:
        current = ssm.get_parameter(Name='NO_IMAGES_FOR_TRAINING', WithDecryption=False)
        noOfImages = current['Parameter']['Value']

    except Exception as e:
        print("Error getNoOfTrainingImages = {}".format(e))
        return {
            "statusCode": 500,
            "NoOfImages": '0'
        }

    return {
        "statusCode": 200,
        "NoOfImages": noOfImages
    }



@app.route('/trainingbatch', methods=['GET'], cors=True, authorizer=app_authorizer)
def getTrainingBatchInfo():

    table = dynamodb.Table('ImageTrainingBatchInfo')
    ke = Key('IdStatus').eq('OK')

    response = table.query(
        IndexName='GSI-ImageTrainingBatchInfo',
        KeyConditionExpression=ke,
        ScanIndexForward=False,
        Limit=30
    )

    return {'Items': response['Items'], 'Count': response['Count']}


@app.route('/trainingparam', methods=['GET'], cors=True, authorizer=app_authorizer)
def getTrainingParam():
    current = ssm.get_parameter(Name='TRAINING_JSON', WithDecryption=False)
    return current['Parameter']['Value']


@app.route('/endpointparam', methods=['GET'], cors=True, authorizer=app_authorizer)
def getEndpointParam():
    current = ssm.get_parameter(Name='ENDPOINT_JSON', WithDecryption=False)
    return current['Parameter']['Value']
