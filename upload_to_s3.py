import boto3
from botocore.exceptions import NoCredentialsError
import requests
import json
from time import sleep

API_KEY = "your-api-key"
bucket = "bucket-to-be-used"
url = "https://api-gtw-url/dev/scan"

boto3.setup_default_session(profile_name='masterworks')

def upload_to_aws(local_file, bucket, s3_file):
    s3 = boto3.client('s3')

    try:
        s3.upload_file(local_file, bucket, s3_file)
        print("Upload Successful")
        return True
    except FileNotFoundError:
        print("The file was not found")
        return False
    except NoCredentialsError:
        print("Credentials not available")
        return False

# change local_file and file_name
localfile = input("Please provide your local file:  ")
filename = input("Please provide the filename on the bucket:  ")

uploaded = upload_to_aws(localfile, bucket, filename)

sleep(15)

data = {'bucket': "" + bucket + "", 'file': "" + filename + ""}

print(data)
headers = {'Content-type': 'application/json', 'x-api-key': API_KEY}
r = requests.post(url, data=json.dumps(data), headers=headers)

print (r.text)
