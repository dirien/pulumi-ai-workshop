# Quick Deployment Guide

## What This Creates

This Pulumi program deploys a complete n8n workflow automation platform on Google Cloud Run with:

1. **Cloud SQL PostgreSQL Database** (`db-g1-small`, 10GB storage)
   - Database: `n8n`
   - User: `n8n-user`
   - Automated backups at 3:00 AM daily

2. **Secret Manager Secrets**
   - Database password (auto-generated, 32 characters)
   - n8n encryption key (auto-generated, 32 characters)

3. **Cloud Run Service**
   - Container: `n8nio/n8n:latest`
   - CPU: 1 core, Memory: 512Mi
   - Auto-scaling: 0-10 instances
   - Health checks enabled
   - CPU throttling disabled for better cold start performance

4. **IAM & Permissions**
   - Service account with Cloud SQL Client and Secret Manager access
   - Public access enabled (can be restricted later)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Initialize stack
pulumi stack init dev

# 3. Configure (replace YOUR_PROJECT_ID)
pulumi config set gcp:project YOUR_PROJECT_ID
pulumi config set gcp:region us-central1

# 4. Deploy (takes ~5-10 minutes)
pulumi up

# 5. Get the URL
pulumi stack output serviceUrl
```

## First Time Setup

1. Visit the URL from `pulumi stack output serviceUrl`
2. Create your admin account (first user becomes admin)
3. Start creating workflows!

## Cost Estimate

**Monthly cost: ~$10-30** (varies by usage)

- Cloud Run: Free tier covers most small deployments
- Cloud SQL: ~$9/month for db-g1-small
- Secret Manager: ~$0.06/month for 2 secrets
- Storage & Backups: ~$1-2/month

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Google Cloud Project                  │
│                                                          │
│  ┌──────────────────┐         ┌──────────────────┐     │
│  │   Cloud Run      │         │   Cloud SQL      │     │
│  │   (n8n Service)  │────────▶│   (PostgreSQL)   │     │
│  │                  │         │                  │     │
│  │  - Auto-scaling  │         │  - db-g1-small   │     │
│  │  - 0-10 instances│         │  - 10GB storage  │     │
│  └──────────────────┘         └──────────────────┘     │
│           │                                              │
│           │                                              │
│           ▼                                              │
│  ┌──────────────────┐                                   │
│  │ Secret Manager   │                                   │
│  │                  │                                   │
│  │ - DB Password    │                                   │
│  │ - Encryption Key │                                   │
│  └──────────────────┘                                   │
│                                                          │
│  ┌──────────────────┐                                   │
│  │ Service Account  │                                   │
│  │                  │                                   │
│  │ - SQL Client     │                                   │
│  │ - Secret Access  │                                   │
│  └──────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
```

## Common Operations

### View Logs
```bash
gcloud run services logs read n8n --region=us-central1
```

### Update n8n Version
```bash
pulumi config set n8nImage n8nio/n8n:1.x.x
pulumi up
```

### Scale Configuration
Edit `index.ts` to change:
- `minInstanceCount`: Keep instances warm (prevents cold starts)
- `maxInstanceCount`: Maximum concurrent instances
- CPU/Memory limits

### Custom Domain
```bash
pulumi config set webhookUrl https://your-domain.com
pulumi up
```

Then configure Cloud Run domain mapping in GCP Console.

## Troubleshooting

### Cold Starts (10-30 seconds)
- Set `minInstanceCount: 1` in the code
- Already configured with `cpu-throttling: false`

### Database Connection Errors
```bash
# Check SQL instance status
gcloud sql instances describe n8n-db

# Check Cloud Run logs
gcloud run services logs read n8n --region=us-central1 --limit=50
```

### Permission Errors
```bash
# Verify service account permissions
pulumi stack output serviceAccountEmail
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:EMAIL"
```

## Security Notes

- Database password is auto-generated and stored in Secret Manager
- Encryption key is auto-generated for n8n data encryption
- Service account follows principle of least privilege
- For production: Enable deletion protection and use REGIONAL availability

## Cleanup

```bash
pulumi destroy
```

This will remove all resources. Note: If deletion protection is enabled on the database, you'll need to disable it first.
