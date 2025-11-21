# AWS S3 Static Website - Pulumi AI Workshop

A complete Pulumi TypeScript project that deploys a static website to AWS S3 with public access.

## Purpose

This project demonstrates Infrastructure as Code (IaC) using Pulumi to:
- Create an S3 bucket with a random suffix for uniqueness
- Enable static website hosting
- Configure public read access via bucket policy
- Automatically upload HTML content with proper content-types
- Export the website URL for easy access

**⚠️ Note:** This configuration enables public access to the S3 bucket for demonstration purposes only. In production environments, consider implementing proper access controls, CloudFront distributions, and security best practices.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/) (v3.0.0 or later)
- [Node.js](https://nodejs.org/) (v18.0.0 or later)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- AWS account with appropriate permissions
- [Pulumi ESC](https://www.pulumi.com/docs/pulumi-cloud/esc/) environment configured with AWS credentials

## Project Structure

```
pulumi-ai-workshop/
├── html/
│   ├── index.html          # Main landing page
│   └── error.html          # Error page (404, etc.)
├── index.ts                # Main Pulumi program
├── package.json            # Node.js dependencies
├── tsconfig.json           # TypeScript configuration
├── Pulumi.yaml             # Pulumi project configuration
├── Pulumi.dev.yaml         # Stack configuration for 'dev' stack
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/dirien/pulumi-ai-workshop.git
   cd pulumi-ai-workshop
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Authentication Setup

This project uses Pulumi ESC (Environments, Secrets, and Configuration) for AWS credential management.

### Configure ESC Environment

The project is configured to use the ESC environment named `my esc`. Ensure this environment exists and contains your AWS credentials:

```bash
# List available ESC environments
pulumi env ls

# Open and verify your environment
pulumi env open "my esc"
```

Your ESC environment should provide the following AWS credentials:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN` (if using temporary credentials)

The environment is automatically loaded via the `Pulumi.dev.yaml` configuration:
```yaml
environment:
  - my esc
```

## Deployment

### 1. Initialize Stack

If this is your first time deploying, initialize the stack:

```bash
pulumi stack init dev
```

If the stack already exists, select it:

```bash
pulumi stack select dev
```

### 2. Preview Changes

Preview the infrastructure changes before deploying:

```bash
pulumi preview
```

This will show you:
- S3 bucket to be created
- Random suffix generation
- Bucket policy configuration
- HTML files to be uploaded
- Outputs (website URL)

### 3. Deploy Infrastructure

Deploy the infrastructure:

```bash
pulumi up
```

Review the changes and confirm by selecting `yes`. The deployment will:
1. Generate a random 6-character suffix
2. Create an S3 bucket in `eu-central-1`
3. Enable static website hosting
4. Configure public access settings
5. Apply bucket policy for public read access
6. Upload `index.html` and `error.html`
7. Export the website URL

### 4. Access Your Website

After deployment completes, the website URL will be displayed in the outputs:

```bash
# View stack outputs
pulumi stack output websiteUrl
```

Open the URL in your browser to see your static website!

Example output:
```
Outputs:
  bucketName : "pulumi-workshop-a1b2c3"
  websiteUrl : "http://pulumi-workshop-a1b2c3.s3-website.eu-central-1.amazonaws.com"
```

## Configuration

The project uses the following configuration (defined in `Pulumi.dev.yaml`):

| Key | Value | Description |
|-----|-------|-------------|
| `aws:region` | `eu-central-1` | AWS region for deployment |
| `environment` | `my esc` | Pulumi ESC environment for credentials |

To modify the region:
```bash
pulumi config set aws:region <your-region>
```

## Infrastructure Details

### Resources Created

1. **Random String** (`bucket-suffix`)
   - Generates a 6-character lowercase alphanumeric suffix
   - Ensures bucket name uniqueness

2. **S3 Bucket** (`website-bucket`)
   - Name: `pulumi-workshop-{random-suffix}`
   - Region: `eu-central-1`
   - Static website hosting enabled
   - Index document: `index.html`
   - Error document: `error.html`
   - Force destroy: `true` (allows easy cleanup)

3. **Public Access Block** (`website-public-access-block`)
   - Allows public access to bucket objects
   - Required for static website hosting

4. **Bucket Policy** (`website-bucket-policy`)
   - Grants public read access (`s3:GetObject`)
   - Applies to all objects in the bucket

5. **Bucket Objects**
   - `index.html`: Main landing page
   - `error.html`: Error page
   - Content-Type: `text/html`

## Cleanup

To destroy all resources and clean up:

```bash
pulumi destroy
```

Review the resources to be deleted and confirm by selecting `yes`.

To remove the stack entirely:

```bash
pulumi stack rm dev
```

**Note:** The `forceDestroy: true` setting ensures the S3 bucket can be deleted even if it contains objects.

## Troubleshooting

### Issue: "Access Denied" when accessing website

**Solution:** Ensure the bucket policy has been applied correctly. Run `pulumi up` again to verify all resources are in the correct state.

### Issue: "Bucket name already exists"

**Solution:** The random suffix should prevent this, but if it occurs, run `pulumi destroy` and `pulumi up` again to generate a new suffix.

### Issue: ESC environment not found

**Solution:** Verify your ESC environment exists:
```bash
pulumi env ls
```

If it doesn't exist, create one or update `Pulumi.dev.yaml` with the correct environment name.

### Issue: AWS credentials not working

**Solution:** Verify your ESC environment contains valid AWS credentials:
```bash
pulumi env open "my esc"
```

## Security Considerations

⚠️ **Important Security Notes:**

1. **Public Access:** This configuration makes the S3 bucket publicly readable. This is intentional for static website hosting but should be carefully considered for production use.

2. **No Encryption:** The bucket does not have encryption enabled. For production, consider enabling:
   - Server-side encryption (SSE-S3 or SSE-KMS)
   - Encryption in transit (HTTPS via CloudFront)

3. **No CloudFront:** Direct S3 website hosting is used. For production, consider:
   - CloudFront distribution for HTTPS support
   - Edge caching for better performance
   - Custom domain with Route53

4. **Credential Management:** Always use Pulumi ESC or similar secret management solutions. Never commit AWS credentials to version control.

## Next Steps

To enhance this project, consider:

1. **Add CloudFront distribution** for HTTPS and better performance
2. **Configure custom domain** with Route53
3. **Enable S3 bucket versioning** for content history
4. **Add CloudWatch alarms** for monitoring
5. **Implement CI/CD pipeline** for automated deployments
6. **Add more HTML pages** and assets (CSS, JavaScript, images)

## Resources

- [Pulumi Documentation](https://www.pulumi.com/docs/)
- [Pulumi AWS Provider](https://www.pulumi.com/registry/packages/aws/)
- [Pulumi ESC Documentation](https://www.pulumi.com/docs/pulumi-cloud/esc/)
- [AWS S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)

## License

See [LICENSE](LICENSE) file for details.
