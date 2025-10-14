# AWS Static Website with Pulumi (TypeScript)

A complete Infrastructure as Code (IaC) solution for deploying a static website on AWS S3 using Pulumi with TypeScript. This project demonstrates how to host a simple static website with automatic file uploads and Pulumi ESC authentication.

## 🎯 Project Purpose

This project showcases:
- **AWS S3 Static Website Hosting**: Deploy a public static website using S3
- **Pulumi Infrastructure as Code**: Manage infrastructure declaratively with TypeScript
- **Pulumi ESC Authentication**: Secure AWS credential management using Pulumi Environments, Secrets, and Configuration (ESC)
- **Automated Deployment**: Upload HTML files automatically as part of the infrastructure deployment

**Note**: This is a demo/learning project. For production use, consider adding CloudFront CDN, HTTPS/SSL, custom domains, and enhanced security measures.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1. **Pulumi CLI** (v3.0.0 or later)
   ```bash
   # macOS
   brew install pulumi/tap/pulumi
   
   # Linux
   curl -fsSL https://get.pulumi.com | sh
   
   # Windows
   choco install pulumi
   ```
   
   Verify installation:
   ```bash
   pulumi version
   ```

2. **Node.js** (v14 or later) and npm
   ```bash
   node --version
   npm --version
   ```

3. **Pulumi Account**
   - Sign up at [https://app.pulumi.com](https://app.pulumi.com)
   - Login via CLI:
     ```bash
     pulumi login
     ```

4. **AWS Account**
   - You need an AWS account with appropriate permissions to create S3 buckets
   - AWS credentials will be provided via Pulumi ESC (no need to configure AWS CLI)

## 📁 Project Structure

```
.
├── html/                    # Static website files
│   ├── index.html          # Main page
│   └── error.html          # Error page
├── index.ts                # Pulumi infrastructure code
├── package.json            # Node.js dependencies
├── tsconfig.json           # TypeScript configuration
├── Pulumi.yaml             # Pulumi project configuration
├── Pulumi.dev.yaml         # Stack configuration (dev)
└── README.md               # This file
```

## 🚀 Getting Started

### Step 1: Clone or Initialize the Project

If you're starting fresh:
```bash
pulumi new aws-typescript --name aws-static-website
```

If you have this project already:
```bash
npm install
```

### Step 2: Initialize Pulumi Stack

Create a new stack (deployment environment):
```bash
pulumi stack init dev
```

Configure the AWS region:
```bash
pulumi config set aws:region eu-central-1
```

### Step 3: Configure Pulumi ESC Authentication

This project uses Pulumi ESC (Environments, Secrets, and Configuration) for AWS authentication. The ESC environment `pulumi-idp/auth` provides AWS credentials automatically.

Add the ESC environment to your stack:
```bash
pulumi config env add pulumi-idp/auth --yes
```

Verify the configuration:
```bash
pulumi config
```

You should see:
```
KEY                 VALUE
aws:region          eu-central-1

ENVIRONMENT VARIABLE   VALUE
AWS_ACCESS_KEY_ID      [unknown]
AWS_REGION             us-east-1
AWS_SECRET_ACCESS_KEY  [unknown]
AWS_SESSION_TOKEN      [unknown]
```

**Note**: The AWS credentials are injected at runtime by Pulumi ESC. You don't need to configure AWS CLI or set environment variables manually.

### Step 4: Preview Infrastructure Changes

Before deploying, preview what Pulumi will create:
```bash
pulumi preview
```

This command will:
- Authenticate using Pulumi ESC
- Show all resources that will be created
- Display the planned changes without making any actual modifications

### Step 5: Deploy the Infrastructure

Deploy your static website:
```bash
pulumi up
```

Review the changes and select `yes` to proceed. Pulumi will:
1. Create an S3 bucket with a random 6-letter suffix
2. Configure static website hosting
3. Set up public access policies
4. Upload `index.html` and `error.html` from the `html/` folder
5. Export the website URL

### Step 6: Access Your Website

After deployment completes, Pulumi will output the website URL:
```bash
pulumi stack output websiteEndpoint
```

Open the URL in your browser:
```bash
# macOS
open "http://$(pulumi stack output websiteEndpoint)"

# Linux
xdg-open "http://$(pulumi stack output websiteEndpoint)"

# Windows
start "http://$(pulumi stack output websiteEndpoint)"
```

Or simply copy the URL and paste it into your browser.

## 📊 Stack Outputs

After deployment, you can retrieve the following outputs:

```bash
# Get the website endpoint
pulumi stack output websiteEndpoint

# Get the S3 bucket name
pulumi stack output bucketName

# Get all outputs
pulumi stack output
```

## 🔧 Customization

### Modify Website Content

Edit the HTML files in the `html/` folder:
- `html/index.html` - Main landing page
- `html/error.html` - Error page (404, etc.)

After making changes, redeploy:
```bash
pulumi up
```

### Change AWS Region

```bash
pulumi config set aws:region us-east-1
pulumi up
```

### Add More Files

Place additional files (CSS, JS, images) in the `html/` folder. The Pulumi program automatically uploads all files from this directory.

## 🧹 Cleanup

To destroy all resources and avoid AWS charges:

```bash
pulumi destroy
```

Review the resources to be deleted and confirm with `yes`.

To remove the stack completely:
```bash
pulumi stack rm dev
```

## 🔐 Security Notes

**Important**: This project creates a **publicly accessible** S3 bucket for demo purposes. For production use:

1. **Use CloudFront CDN**: Add a CloudFront distribution for HTTPS and better performance
2. **Enable HTTPS**: Configure SSL/TLS certificates
3. **Restrict Access**: Implement proper access controls and bucket policies
4. **Add WAF**: Use AWS WAF for additional security
5. **Enable Logging**: Configure S3 access logs and CloudTrail
6. **Custom Domain**: Use Route53 for custom domain names

## 📚 Learn More

- [Pulumi Documentation](https://www.pulumi.com/docs/)
- [Pulumi AWS Provider](https://www.pulumi.com/registry/packages/aws/)
- [Pulumi ESC Documentation](https://www.pulumi.com/docs/esc/)
- [AWS S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)

## 🐛 Troubleshooting

### Issue: "No valid credential sources found"

**Solution**: Ensure the ESC environment is properly configured:
```bash
pulumi config env add pulumi-idp/auth --yes
```

### Issue: "Bucket name already exists"

**Solution**: The random suffix should prevent this, but if it occurs, run:
```bash
pulumi destroy
pulumi up
```

### Issue: Website shows 403 Forbidden

**Solution**: Verify the bucket policy allows public access:
```bash
pulumi up --refresh
```

## 📝 License

This project is provided as-is for educational purposes.

## 🤝 Contributing

Feel free to submit issues or pull requests to improve this project.

---

**Built with ❤️ using Pulumi Infrastructure as Code**
