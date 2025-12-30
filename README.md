# n8n on Google Cloud Run with Pulumi

This Pulumi program deploys [n8n](https://n8n.io/) (workflow automation tool) on Google Cloud Run with a PostgreSQL database for persistence. The setup is based on the [official n8n documentation](https://docs.n8n.io/hosting/installation/server-setups/google-cloud-run/).

## Architecture

This deployment creates:

- **Cloud SQL PostgreSQL instance** - Persistent database for n8n workflows and execution data
- **Secret Manager secrets** - Secure storage for database password and encryption key
- **Cloud Run service** - Serverless container running n8n
- **Service Account** - With appropriate IAM permissions for Cloud SQL and Secret Manager access
- **Required APIs** - Automatically enables Cloud Run, Cloud SQL Admin, and Secret Manager APIs

## Features

- **Serverless & Cost-Effective**: Scales to zero when idle, pay only for what you use
- **Persistent Storage**: PostgreSQL database ensures your workflows and data are preserved
- **Secure**: Credentials stored in Secret Manager, not in environment variables
- **Production-Ready**: Includes health checks, proper resource limits, and backup configuration
- **No Cold Start Throttling**: CPU throttling disabled for better performance

## Prerequisites

1. [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/) installed
2. [Node.js](https://nodejs.org/) installed
3. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and authenticated
4. A Google Cloud project with billing enabled

## Setup

### 1. Authenticate with Google Cloud

```bash
gcloud auth login
gcloud auth application-default login
```

### 2. Set your Google Cloud project

```bash
gcloud config set project YOUR_PROJECT_ID
```

### 3. Install dependencies

```bash
npm install
```

### 4. Initialize Pulumi stack

```bash
pulumi stack init dev
```

### 5. Configure the stack

Set your Google Cloud project and region:

```bash
pulumi config set gcp:project YOUR_PROJECT_ID
pulumi config set gcp:region us-central1  # or your preferred region
```

Optional configurations:

```bash
# Set custom database tier (default: db-g1-small)
pulumi config set dbTier db-g1-small

# Set PostgreSQL version (default: POSTGRES_15)
pulumi config set dbVersion POSTGRES_15

# Set n8n Docker image (default: n8nio/n8n:latest)
pulumi config set n8nImage n8nio/n8n:latest

# Set custom webhook URL (for custom domains)
pulumi config set webhookUrl https://your-domain.com
```

### 6. Deploy

```bash
pulumi up
```

Review the changes and confirm. The deployment takes about 5-10 minutes.

## Accessing n8n

After deployment, Pulumi will output the service URL:

```bash
pulumi stack output serviceUrl
```

Visit this URL in your browser. On first access, you'll be prompted to create an admin account.

## Configuration Options

| Config Key | Description | Default |
|------------|-------------|---------|
| `gcp:project` | Google Cloud project ID | (required) |
| `gcp:region` | Google Cloud region | `us-central1` |
| `dbTier` | Cloud SQL instance tier | `db-g1-small` |
| `dbVersion` | PostgreSQL version | `POSTGRES_15` |
| `n8nImage` | n8n Docker image | `n8nio/n8n:latest` |
| `webhookUrl` | Custom webhook URL | (optional) |

## Cost Optimization

The default configuration is optimized for cost:

- **Cloud Run**: Scales to zero when idle (free tier: 2 million requests/month)
- **Cloud SQL**: Small instance (`db-g1-small`) with 10GB storage
- **Secret Manager**: Minimal cost for storing 2 secrets

Estimated monthly cost: **$10-30** depending on usage.

### Reducing Cold Starts

If cold starts (10-30 seconds) are problematic, you can set a minimum instance count:

Edit `index.ts` and change:

```typescript
scaling: {
    minInstanceCount: 1,  // Keep at least 1 instance running
    maxInstanceCount: 10,
}
```

Note: This will increase costs as you'll pay for at least one instance running 24/7.

## Production Considerations

For production deployments, consider:

1. **Enable deletion protection**:
   ```typescript
   deletionProtection: true,  // in DatabaseInstance
   ```

2. **Use a custom domain**:
   - Set up Cloud Run domain mapping
   - Configure `webhookUrl` config

3. **Increase resources**:
   ```typescript
   resources: {
       limits: {
           cpu: "2",
           memory: "1Gi",
       },
   }
   ```

4. **Enable high availability**:
   ```typescript
   settings: {
       availabilityType: "REGIONAL",  // instead of ZONAL
   }
   ```

5. **Set up monitoring and alerting** using Google Cloud Monitoring

## Troubleshooting

### Cold Starts

If webhooks are failing due to cold starts:

1. Set `minInstanceCount: 1` to keep an instance warm
2. The `cpu-throttling: false` annotation is already set to improve startup time

### Database Connection Issues

Verify the Cloud SQL instance is running:

```bash
gcloud sql instances list
```

Check Cloud Run logs:

```bash
gcloud run services logs read n8n --region=us-central1
```

### Secret Access Issues

Ensure the service account has the correct permissions:

```bash
pulumi stack output serviceAccountEmail
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:SERVICE_ACCOUNT_EMAIL"
```

## Updating n8n

To update to a new version of n8n:

```bash
pulumi config set n8nImage n8nio/n8n:1.x.x
pulumi up
```

## Cleanup

To destroy all resources:

```bash
pulumi destroy
```

## Resources

- [n8n Documentation](https://docs.n8n.io/)
- [n8n Google Cloud Run Guide](https://docs.n8n.io/hosting/installation/server-setups/google-cloud-run/)
- [Pulumi GCP Documentation](https://www.pulumi.com/registry/packages/gcp/)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)

## License

Apache License 2.0
