# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3
import logging
import json

ssm = boto3.client('ssm')

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

def lambda_handler(event, context):

    logger.debug("Raw Event: {}".format(json.dumps(event)))

    try:
        ssm.put_parameter(Name='NO_IMAGES_FOR_TRAINING',
                          Value='0',
                          Type='String', Overwrite=True)

    except Exception as e:
        print("Error when updating NoOfImagesForTraining = {}".format(e))
        return {
            "NoOfImagesForTraining": 'Not Updated due to error.'
        }

    return {
        "NoOfImagesForTraining": 'Updated to 0'
    }

