import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as random from "@pulumi/random";

// Generate a random 6-character suffix for the bucket name
const suffix = new random.RandomString("bucket-suffix", {
    length: 6,
    special: false,
    upper: false,
});

// Create an S3 bucket with static website hosting enabled
const bucket = new aws.s3.Bucket("website-bucket", {
    bucket: pulumi.interpolate`pulumi-workshop-${suffix.result}`,
    forceDestroy: true,
    website: {
        indexDocument: "index.html",
        errorDocument: "error.html",
    },
    tags: {
        Name: "Pulumi AI Workshop Static Website",
        Purpose: "Demo",
    },
});

// Configure public access block settings to allow public access
const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("website-public-access-block", {
    bucket: bucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
});

// Create a bucket policy to allow public read access
const bucketPolicy = new aws.s3.BucketPolicy("website-bucket-policy", {
    bucket: bucket.id,
    policy: pulumi.all([bucket.arn]).apply(([bucketArn]) => JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: `${bucketArn}/*`,
        }],
    })),
}, { dependsOn: [publicAccessBlock] });

// Upload index.html
const _indexHtml = new aws.s3.BucketObject("index.html", {
    bucket: bucket.id,
    key: "index.html",
    source: new pulumi.asset.FileAsset("html/index.html"),
    contentType: "text/html",
}, { dependsOn: [bucketPolicy] });

// Upload error.html
const _errorHtml = new aws.s3.BucketObject("error.html", {
    bucket: bucket.id,
    key: "error.html",
    source: new pulumi.asset.FileAsset("html/error.html"),
    contentType: "text/html",
}, { dependsOn: [bucketPolicy] });

// Export the website URL
export const websiteUrl = pulumi.interpolate`http://${bucket.websiteEndpoint}`;
export const bucketName = bucket.id;
