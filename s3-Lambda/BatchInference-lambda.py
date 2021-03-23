# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import json
import zipfile
import boto3
import uuid
import os
import base64

IMAGE_INFERENCE_URL = os.environ['IMAGE_INFERENCE_URL']

from datetime import datetime
import requests
from botocore.exceptions import ClientError

s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')  

def lambda_handler(event, context):
    # TODO implement
    print(event)
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key'] 
        key_ = os.path.split(key)
        print(bucket, key, key_[-1])
        
        local_zip_file = '/tmp/'+key_[-1]
        s3_client.download_file(bucket, key, local_zip_file)
    
        batch_name_ = (key_[-1].split("_"))[-1]
        batch_name = batch_name_[:-4]
        print(local_zip_file, batch_name)
        
        uu_id = str(uuid.uuid4())
        batchState = 'Processing'
        timenow = datetime.now()
        table = dynamodb.Table('ImageBatchInfo')
        table.put_item(
           Item={
               'BatchId': uu_id,
               'BatchName': batch_name,
               'CreationTime': int(timenow.strftime("%Y%m%d%H%M%S")),
               'CTime': timenow.strftime('%b %d,%Y %H:%M') + " UTC",
               'Status': 'OK',
               'batchStatus': batchState
            })
        batchState = "Success"
        with zipfile.ZipFile(local_zip_file, 'r') as zip_ref:
            print(zip_ref.namelist())
            zip_ref.extractall('/tmp')
            
            table = dynamodb.Table('ImageBatchDetailsInfo') 
            for name in zip_ref.namelist():
                print(name)
                if name[-1] != '/':
                    # skip the unzipped folder
                    # Encode the images into base64 and send to API GW
                    name_ = os.path.split(name)
                    with open('/tmp/'+name, "rb") as image_file:
                        img = base64.b64encode(image_file.read())
                    payload = {
                        "BatchId": uu_id,
                        "BatchName": batch_name,
                        "FileName": name_[-1],
                        "img": img.decode('ascii') 
                    }
                    #print(payload)
                    api_url = IMAGE_INFERENCE_URL
                    response = requests.put(api_url, json=payload)
                    
                    # print (response.content)
                     
                    res = json.loads(response.content)
                    if res['statusCode'] == 200:
                        percent = "P1= {}%".format(round(res['percent']['p1'], 2))
                        status = "Success"
                        originalImg = res['originalImageKey']
                    else:
                        percent = "P1 = 0"
                        status = "Failure"
                        batchState = 'Failure'
                        originalImg = name_[-1]
                        
                    table.put_item(
                        Item={
                            'BatchId': uu_id,
                            'Id': str(uuid.uuid4()),
                            'OriginalImage': originalImg,
                            'AnalyzedImage': "NA" if res['analyzedImageKey'] == '' else res['analyzedImageKey'],
                            'Endpoint': res['EndpointUsed'],
                            'Percent': percent,
                            'Status' : status
                        })    
                    # Upload unzipped images to S3
                    #key = 'public/inference/{}_{}_Org_{}'.format(uu_id,batch_name,name_[-1])
                    # print(key)
                    # s3_client.upload_file('/tmp/'+name,bucket,key)
                
            zip_ref.close()
    
      
    table = dynamodb.Table('ImageBatchInfo')
    
    table.update_item(
        Key={
            'BatchId': uu_id,
            'CreationTime': int(timenow.strftime("%Y%m%d%H%M%S"))
        },
        UpdateExpression="set batchStatus = :b",
        ExpressionAttributeValues={
            ':b': batchState,
        },
        ReturnValues="UPDATED_NEW"
    )
            
    return {
        'statusCode': 200,
        'body': json.dumps('Batch Processed')
    }
