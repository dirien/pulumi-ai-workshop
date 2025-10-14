# AWS Static Website with Pulumi

A demonstration project that deploys a static website to AWS S3 using Pulumi Infrastructure as Code with TypeScript.

## 📋 Purpose

This project showcases how to:
- Deploy a static website to AWS S3
- Configure S3 bucket for website hosting
- Enable public access for demo purposes
- Use Pulumi ESC for AWS authentication
- Automate infrastructure deployment with Pulumi

**⚠️ Note**: This configuration enables public access to the S3 bucket for demonstration purposes. In production environments, use CloudFront with Origin Access Control (OAC) for better security, HTTPS support, and CDN capabilities.

## 🏗️ Architecture

The infrastructure consists of:
- **S3 Bucket**: Static website hosting with random suffix for uniqueness
- **Bucket Policy**: Public read access for website content
- **HTML Files**: Automatically uploaded from `html/` folder
- **Website Configuration**: Index and error document routing

## 📁 Project Structure

```
pulumi-ai-workshop/
├── html/                    # Website content
│   ├── index.html          # Main page
│   └── error.html          # Error page
├── index.ts                # Pulumi infrastructure code
├── package.json            # Node.js dependencies
├── tsconfig.json           # TypeScript configuration
├── Pulumi.yaml             # Pulumi project definition
├── Pulumi.dev.yaml         # Stack configuration (dev)
└── README.md               # This file
```

## 🔧 Prerequisites

Before you begin, ensure you have:

1. **Pulumi CLI** (v3.0 or later)
   ```bash
   # macOS
   brew install pulumi/tap/pulumi
   
   # Linux
   curl -fsSL https://get.pulumi.com | sh
   
   # Windows
   choco install pulumi
   ```

2. **Node.js** (v18 or later)
   ```bash
   # Check version
   node --version
   ```

3. **Pulumi Account**
   - Sign up at [https://app.pulumi.com](https://app.pulumi.com)
   - Access to the `pulumi-idp/auth` ESC environment

4. **AWS Account**
   - AWS credentials configured via ESC environment

## 🚀 Getting Started

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/dirien/pulumi-ai-workshop.git
cd pulumi-ai-workshop

# Install Node.js dependencies
npm install
```

### 2. Configure Pulumi ESC Authentication

This project uses **Pulumi ESC (Environments, Secrets, and Configuration)** to manage AWS credentials securely.

#### Set up ESC Environment

The project is configured to use the `pulumi-idp/auth` ESC environment. To configure it for your stack:

```bash
# Add the ESC environment to your stack
pulumi config env add pulumi-idp/auth --stack dev
```

#### Verify ESC Configuration

Check that the environment is properly configured:

```bash
# List configured environments
pulumi config env ls --stack dev

# Open the environment to verify AWS credentials are available
pulumi env open pulumi-idp/auth
```

The ESC environment should provide AWS credentials including:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (should be `eu-central-1`)

### 3. Initialize Pulumi Stack

```bash
# Initialize a new stack (if not already created)
pulumi stack init dev

# Select the stack
pulumi stack select dev
```

### 4. Configure AWS Region

```bash
# Set AWS region to eu-central-1
pulumi config set aws:region eu-central-1
```

### 5. Preview Infrastructure Changes

Before deploying, preview what Pulumi will create:

```bash
pulumi preview
```

This will show:
- S3 bucket with random suffix
- Bucket ownership controls
- Public access block settings
- Bucket policy for public read access
- HTML file uploads

### 6. Deploy Infrastructure

Deploy the infrastructure to AWS:

```bash
pulumi up
```

Review the changes and confirm by selecting `yes`.

### 7. Access Your Website

After deployment completes, Pulumi will output the website URL:

```bash
# View stack outputs
pulumi stack output websiteUrl
```

Open the URL in your browser to see your static website!

Example output:
```
Outputs:
    bucketName : "static-website-abcdef"
    websiteUrl : "http://static-website-abcdef.s3-website.eu-central-1.amazonaws.com"
```

## 🔄 Making Changes

### Update Website Content

1. Edit files in the `html/` folder
2. Run `pulumi up` to deploy changes
3. Pulumi will automatically update the S3 objects

### Modify Infrastructure

1. Edit `index.ts` to change infrastructure configuration
2. Run `pulumi preview` to see planned changes
3. Run `pulumi up` to apply changes

## 🧹 Cleanup

To destroy all resources and avoid AWS charges:

```bash
# Destroy all infrastructure
pulumi destroy

# Confirm by typing 'yes'

# Optionally remove the stack
pulumi stack rm dev
```

## 📚 Key Concepts

### Pulumi ESC (Environments, Secrets, and Configuration)

ESC provides centralized management of:
- **Secrets**: AWS credentials, API keys
- **Configuration**: Environment-specific settings
- **Dynamic Credentials**: Short-lived cloud credentials via OIDC

Benefits:
- No hardcoded credentials in code
- Centralized secret management
- Automatic credential rotation
- Environment-based configuration

### S3 Static Website Hosting

S3 can host static websites with:
- Index document routing
- Error document handling
- Public HTTP access
- Cost-effective hosting

### Infrastructure as Code with Pulumi

Pulumi enables:
- Version-controlled infrastructure
- Repeatable deployments
- Preview before apply
- Multi-cloud support
- Real programming languages (TypeScript, Python, Go, etc.)

## 🔐 Security Considerations

**Current Configuration (Demo Only)**:
- ✅ Public read access enabled
- ✅ HTTP only (no HTTPS)
- ✅ Direct S3 website endpoint

**Production Recommendations**:
- 🔒 Use CloudFront with Origin Access Control (OAC)
- 🔒 Enable HTTPS with ACM certificates
- 🔒 Implement WAF rules for protection
- 🔒 Enable CloudFront logging
- 🔒 Use custom domain with Route53
- 🔒 Implement security headers

## 📖 Additional Resources

- [Pulumi Documentation](https://www.pulumi.com/docs/)
- [Pulumi ESC Documentation](https://www.pulumi.com/docs/esc/)
- [AWS S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [Pulumi AWS Provider](https://www.pulumi.com/registry/packages/aws/)

## 🤝 Contributing

This is a workshop/demo project. Feel free to fork and experiment!

## 📝 License

See LICENSE file for details.

## 🆘 Troubleshooting

### ESC Environment Not Found

```bash
# Verify you have access to the environment
pulumi env ls

# Check environment configuration
pulumi env open pulumi-idp/auth
```

### AWS Credentials Not Working

```bash
# Verify ESC is providing credentials
pulumi env open pulumi-idp/auth

# Check AWS region configuration
pulumi config get aws:region
```

### Website Not Accessible

1. Verify bucket policy is applied: `pulumi stack output bucketName`
2. Check public access settings in AWS Console
3. Ensure files are uploaded: Check S3 bucket in AWS Console
4. Wait a few minutes for DNS propagation

### TypeScript Compilation Errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Verify TypeScript compilation
npx tsc --noEmit
```

## 🎯 Next Steps

After completing this workshop, consider:
1. Adding CloudFront distribution for HTTPS
2. Implementing custom domain with Route53
3. Adding CI/CD pipeline with GitHub Actions
4. Exploring Pulumi Automation API
5. Deploying to multiple environments (staging, prod)
