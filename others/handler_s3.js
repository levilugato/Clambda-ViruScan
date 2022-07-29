const { execSync } = require("child_process");
const { writeFileSync, unlinkSync } = require("fs");
const AWS = require("aws-sdk");
const util = require('util');
const util_aws = require('aws-sdk/lib/util')

const exec = util.promisify(require('child_process').exec);

console.time("functiontime");

async function rm() {
    const { stdout, stderr } = await exec('rm -rf /tmp/*');
    console.log('stdout:', stdout);
}
rm();

const s3 = new AWS.S3();

function copyFile(params) {
    return s3.copyObject(params, function (err, data) {
        if (err)
            console.log(err, err);
        else {
            console.log(data);
        }
    }).promise();
}

function deleteFile(params) {
    return s3.deleteObject(params, function (err, data) {
        if (err)
            console.log(err, err);
        else {
            console.log(data);
        }
    }).promise();
}

module.exports.virusScan = async (event, context) => {
    const sourceFolder = 'to_scan'
    const destFolder = 'files'

    if (!event.Records) {
        console.log("Not an S3 event invocation!");
        return;
    }

    for (const record of event.Records) {

        const object_name = record.s3.object.key.split('/')

        //const sanitized_name = object_name[1].replace(/\s/g, '');
        const sanitized_name = util_aws.uriEscape(object_name[1])

        console.log(sanitized_name)
        
        const get_delete_params = {
            Bucket: record.s3.bucket.name,
            Key: `${sourceFolder}/${object_name[1]}`,
        }

        const copy_params = {
            Bucket: record.s3.bucket.name,
            CopySource: record.s3.bucket.name + "/" + record.s3.object.key,
            Key: `${destFolder}/${object_name[1]}`
        };

        if (!record.s3) {
            console.log("Not an S3 Record!");
            continue;
        }

        // get the file
        const s3Object = await s3
            .getObject(get_delete_params).promise();

        try {
            // write file to disk
            console.log('writing object to disk...')
            
            writeFileSync(`/tmp/${sanitized_name}`, s3Object.Body)
    
            console.log("scanning file.....")
            
            // scan it
            execSync(`./bin/clamscan --database=./var/lib/clamav /tmp/${sanitized_name}`);
            
            // if ok, Copy to files subfolder
            await copyFile(copy_params);
            console.log('File is clean, copying to directory...')
            unlinkSync(`/tmp/${sanitized_name}`);
            console.log('Deleting it from scan path...')
            await deleteFile(get_delete_params);
            
        } catch (err) {
            console.error(err)
            if (err.status === 1) {
                console.log('File is Infected, deleting it.....')
                unlinkSync(`/tmp/${sanitized_name}`);
                await deleteFile(get_delete_params);
                return err
            }
        }
    }
    console.timeEnd("functiontime");
}