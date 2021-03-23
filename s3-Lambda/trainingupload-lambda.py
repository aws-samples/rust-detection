# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import json
import zipfile
import boto3
import uuid
import os

from datetime import datetime

s3_client = boto3.client('s3')
ssm_client = boto3.client('ssm')
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

        # get file_name from the key
        file_name_ = (key_[-1].split("_"))[-1]
        # strip the .zip suffix
        file_name = file_name_[:-4]
        print(local_zip_file, file_name)

        uu_id = str(uuid.uuid4())
        table = dynamodb.Table('ImageTrainingBatchInfo')

        with zipfile.ZipFile(local_zip_file, 'r') as zip_ref:
            name_list = zip_ref.namelist()
            # unzip into /tmp folder
            zip_ref.extractall('/tmp')
            print("Original name list"+str(name_list))
        # Get rid of 'folder' in the zip file
        for name in name_list:
            if name[-1]=='/':
                name_list.remove(name)
        print("Updaed name list"+str(name_list))
        if len(name_list) % 2 !=0:
            table.put_item(
                Item={
                    'Id': uu_id,
                    'FileName': file_name_,
                    'Status': 'Failure',
                    'Description': 'Uploaded zip file contains ODD number of files',
                    'CreationTime': int(datetime.now().strftime("%Y%m%d%H%M%S")),
                    'CTime': datetime.now().strftime('%b %d,%Y %H:%M') + " UTC",
                    'IdStatus': 'OK'
                })
            return {
                    'statusCode': 500,
                    'body': json.dumps('Uploaded training folder contains odd number of files')
                    }
        else:
            # The sorting makes sure image and xml files come in pairs
            name_list.sort()
            num_imgs = int(len(name_list) / 2)
            print("Number of images",num_imgs)

        status = 'Success'
        des = 'Following image and XML files name does NOT match:\n'
        for i in list(range(num_imgs)):
            img_name = name_list[i*2]
            xml_name = name_list[i*2+1]
            img_name_ = os.path.split(img_name)[-1]
            xml_name_ = os.path.split(xml_name)[-1]

            if img_name_[:-4] != xml_name_[:-4]:
                status = 'Failure'
                des += img_name_ + ' ' + xml_name_ + '\n'
        table.put_item(
            Item={
                'Id': uu_id,
                'FileName': file_name_,
                'Status': status,
                'Description': ' ' if status == 'Success' else des,
                'CreationTime': int(datetime.now().strftime("%Y%m%d%H%M%S")),
                'CTime': datetime.now().strftime('%b %d,%Y %H:%M') + " UTC",
                'IdStatus': 'OK'
            })


        # File name matching check is done, ready to upload to S3
        if status == 'Success':
            for name in name_list:
                name_ = os.path.split(name)[-1]
                key = 'public/training-images/{}_{}/Train_{}'.format(uu_id, file_name,name_)
                s3_client.upload_file('/tmp/'+name,bucket,key)
        else:
            return {
                    'statusCode': 500,
                    'body': json.dumps('image and xml files name does NOT match')
                }
        # Update Parameter Store
        parameter = ssm_client.get_parameter(Name='NO_IMAGES_FOR_TRAINING')
        num_train = int(parameter['Parameter']['Value'])
        ssm_client.put_parameter(Name='NO_IMAGES_FOR_TRAINING', Value=str(num_train+num_imgs), Type='String',Overwrite=True)
        print("Parameter NO_IMAGES_FOR_TRAINING is updated from {} to {}".format(num_train, num_train+num_imgs))

    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
    }
