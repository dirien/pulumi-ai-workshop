import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as random from "@pulumi/random";
import * as fs from "fs";
import * as path from "path";
import mime from "mime";

// Generate a random 6-letter suffix for bucket uniqueness
const bucketSuffix = new random.RandomString("bucket-suffix", {
    length: 6,
    special: false,
    upper: false,
    numeric: false,
});

// Create S3 bucket with random suffix for uniqueness
const bucket = new aws.s3.Bucket("static-website-bucket", {
    bucket: pulumi.interpolate`static-website-${bucketSuffix.result}`,
    // Enable force destroy to allow deletion even with files
    forceDestroy: true,
});

// Configure static website hosting
const websiteConfiguration = new aws.s3.BucketWebsiteConfiguration("website-config", {
    bucket: bucket.id,
    indexDocument: {
        suffix: "index.html",
    },
    errorDocument: {
        key: "error.html",
    },
});

// Disable block public access settings to allow public website hosting
const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("public-access-block", {
    bucket: bucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
});

// Create bucket policy to allow public read access
const bucketPolicy = new aws.s3.BucketPolicy("bucket-policy", {
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

// Upload HTML files from the html/ folder
const htmlDir = path.join(__dirname, "html");
const htmlFiles = fs.readdirSync(htmlDir);

htmlFiles.forEach(file => {
    const filePath = path.join(htmlDir, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const contentType = mime.getType(filePath) || "application/octet-stream";

    new aws.s3.BucketObject(file, {
        bucket: bucket.id,
        key: file,
        content: fileContent,
        contentType: contentType,
    }, { dependsOn: [bucketPolicy] });
});

// Export the website URL
export const websiteUrl = pulumi.interpolate`http://${bucket.bucketRegionalDomainName}`;
export const websiteEndpoint = websiteConfiguration.websiteEndpoint;
export const bucketName = bucket.id;
