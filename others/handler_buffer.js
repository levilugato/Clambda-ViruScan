const { execSync } = require("child_process");
const { writeFileSync, unlinkSync } = require("fs");
const AWS = require("aws-sdk");
const util = require('util');
const fs = require('fs')

const exec = util.promisify(require('child_process').exec);

async function rm() {
    const { stdout, stderr } = await exec('rm -rf /tmp/*');
}

rm();

const s3 = new AWS.S3();

function deleteFile(params) {
    return s3.deleteObject(params, function (err, data) {
        if (err)
            console.log(err, err);
        else {
            console.log(data);
        }
    }).promise();
}

function response(status, body) {
    return {
        statusCode: status,
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
        },
    };
};

module.exports.virusScan = async (event, context) => {

    var request = JSON.stringify(event.body)
    var requestbody = JSON.parse(request)
    if (requestbody.time)
        time = requestbody.time;

    const bucket = requestbody.bucket
    const file = requestbody.file

    const get_delete_params = {
        Bucket: bucket,
        Key: file
    };

    console.log(get_delete_params)


    try {
        var s3Object = await s3
           .getObject(get_delete_params).promise();

    } catch (err) {
        console.error(err);
        return response(404, err);
    }

    let is_infected;
    let message;

    try {
        // write file to disk
        console.log('writing object to disk...')

        writeFileSync(`/tmp/${file}`, s3Object.Body)

        console.log("scanning file.....")

        // scan it
        execSync(`./bin/clamscan --database=./var/lib/clamav /tmp/${file}`);

        console.log('File is clean....')

        unlinkSync(`/tmp/${file}`);

        is_infected = "CLEAN"
        message = "Ok"

    } catch (err) {

        if (err.status === 1) {

            console.log('File is Infected, deleting it.....')

            unlinkSync(`/tmp/${file}`);

            await deleteFile(get_delete_params);

            is_infected = "INFECTED"
            message = "File has been deleted !"
        }
    }

    const responseBody = {
        file: file,
        status: is_infected,
        message: message
    };

    return response(200, responseBody);
}