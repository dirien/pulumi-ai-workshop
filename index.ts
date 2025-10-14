import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as random from "@pulumi/random";
import * as fs from "fs";
import * as path from "path";
import mime from "mime";

// Generate a random 6-letter suffix for bucket uniqueness
const suffix = new random.RandomString("bucket-suffix", {
    length: 6,
    special: false,
    upper: false,
    numeric: false,
});

// Create an S3 bucket with a random suffix for static website hosting
const bucket = new aws.s3.Bucket("website-bucket", {
    bucket: pulumi.interpolate`static-website-${suffix.result}`,
    website: {
        indexDocument: "index.html",
        errorDocument: "error.html",
    },
    // Allow safe deletion even if bucket contains files (demo purposes)
    forceDestroy: true,
});

// Configure bucket ownership controls to allow ACLs
const ownershipControls = new aws.s3.BucketOwnershipControls("ownership-controls", {
    bucket: bucket.id,
    rule: {
        objectOwnership: "BucketOwnerPreferred",
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

// Create a bucket policy to allow public read access (demo purposes only)
// In production, use CloudFront with OAI/OAC for better security
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
}, { dependsOn: [publicAccessBlock, ownershipControls] });

// Upload HTML files from the html/ folder to the S3 bucket
const htmlDir = path.join(__dirname, "html");
const htmlFiles = fs.readdirSync(htmlDir);

// Upload each HTML file with proper content type
htmlFiles.forEach((file) => {
    const filePath = path.join(htmlDir, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const contentType = mime.getType(filePath) || "application/octet-stream";

    new aws.s3.BucketObject(
        `html-${file}`,
        {
            bucket: bucket.id,
            key: file,
            content: fileContent,
            contentType: contentType,
        },
        { dependsOn: [bucketPolicy] }
    );
});

// Export the bucket name and website endpoint
export const bucketName = bucket.id;
export const websiteUrl = bucket.websiteEndpoint.apply(endpoint => `http://${endpoint}`);
