const AWS = require("aws-sdk");
require("dotenv").config();

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region:"eu-north-1"});

const s3 = new AWS.S3();
const S3_Bucket = process.env.S3_BUCKET;

module.exports = {s3,S3_Bucket};    