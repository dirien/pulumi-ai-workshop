import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as random from "@pulumi/random";

// Get configuration
const config = new pulumi.Config();
const gcpConfig = new pulumi.Config("gcp");
const project = gcpConfig.require("project");
const region = gcpConfig.get("region") || "us-central1";

// Configuration with defaults
const dbTier = config.get("dbTier") || "db-g1-small";
const dbVersion = config.get("dbVersion") || "POSTGRES_15";
const n8nImage = config.get("n8nImage") || "n8nio/n8n:latest";
const webhookUrl = config.get("webhookUrl"); // Optional: custom webhook URL

// Enable required APIs
const runApi = new gcp.projects.Service("cloud-run-api", {
    service: "run.googleapis.com",
    disableOnDestroy: false,
});

const sqlAdminApi = new gcp.projects.Service("sql-admin-api", {
    service: "sqladmin.googleapis.com",
    disableOnDestroy: false,
});

const secretManagerApi = new gcp.projects.Service("secret-manager-api", {
    service: "secretmanager.googleapis.com",
    disableOnDestroy: false,
});

// Generate random password for database
const dbPassword = new random.RandomPassword("db-password", {
    length: 32,
    special: true,
});

// Generate random encryption key for n8n
const encryptionKey = new random.RandomPassword("encryption-key", {
    length: 32,
    special: false,
});

// Create Cloud SQL PostgreSQL instance
const dbInstance = new gcp.sql.DatabaseInstance("n8n-db", {
    databaseVersion: dbVersion,
    region: region,
    settings: {
        tier: dbTier,
        edition: "ENTERPRISE",
        availabilityType: "ZONAL",
        diskSize: 10,
        diskType: "PD_SSD",
        backupConfiguration: {
            enabled: true,
            startTime: "03:00",
        },
        ipConfiguration: {
            ipv4Enabled: true,
            authorizedNetworks: [],
        },
    },
    deletionProtection: false, // Set to true for production
}, { dependsOn: [sqlAdminApi] });

// Create n8n database
const database = new gcp.sql.Database("n8n-database", {
    name: "n8n",
    instance: dbInstance.name,
});

// Create database user
const dbUser = new gcp.sql.User("n8n-user", {
    name: "n8n-user",
    instance: dbInstance.name,
    password: dbPassword.result,
});

// Store database password in Secret Manager
const dbPasswordSecret = new gcp.secretmanager.Secret("db-password-secret", {
    secretId: "n8n-db-password",
    replication: {
        auto: {},
    },
}, { dependsOn: [secretManagerApi] });

const dbPasswordSecretVersion = new gcp.secretmanager.SecretVersion("db-password-version", {
    secret: dbPasswordSecret.id,
    secretData: dbPassword.result,
});

// Store encryption key in Secret Manager
const encryptionKeySecret = new gcp.secretmanager.Secret("encryption-key-secret", {
    secretId: "n8n-encryption-key",
    replication: {
        auto: {},
    },
}, { dependsOn: [secretManagerApi] });

const encryptionKeySecretVersion = new gcp.secretmanager.SecretVersion("encryption-key-version", {
    secret: encryptionKeySecret.id,
    secretData: encryptionKey.result,
});

// Create service account for Cloud Run
const serviceAccount = new gcp.serviceaccount.Account("n8n-service-account", {
    accountId: "n8n-cloud-run",
    displayName: "n8n Cloud Run Service Account",
});

// Grant Cloud SQL Client role to service account
const sqlClientBinding = new gcp.projects.IAMMember("sql-client-binding", {
    project: project,
    role: "roles/cloudsql.client",
    member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
});

// Grant Secret Manager Secret Accessor role to service account
const secretAccessorBinding = new gcp.projects.IAMMember("secret-accessor-binding", {
    project: project,
    role: "roles/secretmanager.secretAccessor",
    member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
});

// Build database connection string
const dbConnectionString = pulumi.interpolate`postgresql://${dbUser.name}:${dbPassword.result}@/${database.name}?host=/cloudsql/${dbInstance.connectionName}`;

// Create Cloud Run service for n8n
const n8nService = new gcp.cloudrunv2.Service("n8n-service", {
    name: "n8n",
    location: region,
    ingress: "INGRESS_TRAFFIC_ALL",
    template: {
        serviceAccount: serviceAccount.email,
        containers: [{
            image: n8nImage,
            ports: {
                containerPort: 5678,
            },
            envs: [
                {
                    name: "DB_TYPE",
                    value: "postgresdb",
                },
                {
                    name: "DB_POSTGRESDB_DATABASE",
                    value: database.name,
                },
                {
                    name: "DB_POSTGRESDB_HOST",
                    value: pulumi.interpolate`/cloudsql/${dbInstance.connectionName}`,
                },
                {
                    name: "DB_POSTGRESDB_USER",
                    value: dbUser.name,
                },
                {
                    name: "DB_POSTGRESDB_PASSWORD",
                    valueSource: {
                        secretKeyRef: {
                            secret: dbPasswordSecret.secretId,
                            version: "latest",
                        },
                    },
                },
                {
                    name: "N8N_ENCRYPTION_KEY",
                    valueSource: {
                        secretKeyRef: {
                            secret: encryptionKeySecret.secretId,
                            version: "latest",
                        },
                    },
                },
                {
                    name: "N8N_HOST",
                    value: webhookUrl || "",
                },
                {
                    name: "WEBHOOK_URL",
                    value: webhookUrl || "",
                },
                {
                    name: "GENERIC_TIMEZONE",
                    value: "UTC",
                },
                {
                    name: "N8N_LOG_LEVEL",
                    value: "info",
                },
            ],
            resources: {
                limits: {
                    cpu: "1",
                    memory: "512Mi",
                },
            },
            startupProbe: {
                httpGet: {
                    path: "/healthz",
                    port: 5678,
                },
                initialDelaySeconds: 10,
                timeoutSeconds: 3,
                periodSeconds: 10,
                failureThreshold: 3,
            },
        }],
        scaling: {
            minInstanceCount: 0,
            maxInstanceCount: 10,
        },
        vpcAccess: {
            connector: undefined, // Add VPC connector if needed
            egress: "PRIVATE_RANGES_ONLY",
        },
        // Add Cloud SQL connection
        annotations: {
            "run.googleapis.com/cloudsql-instances": dbInstance.connectionName,
            "run.googleapis.com/cpu-throttling": "false", // Prevent CPU throttling for better cold start performance
        },
    },
}, { 
    dependsOn: [
        runApi, 
        dbInstance, 
        database, 
        dbUser, 
        dbPasswordSecretVersion, 
        encryptionKeySecretVersion,
        sqlClientBinding,
        secretAccessorBinding,
    ] 
});

// Make the service publicly accessible
const iamPolicy = new gcp.cloudrunv2.ServiceIamMember("n8n-invoker", {
    name: n8nService.name,
    location: region,
    role: "roles/run.invoker",
    member: "allUsers",
});

// Export important values
export const serviceUrl = n8nService.uri;
export const databaseInstanceName = dbInstance.name;
export const databaseConnectionName = dbInstance.connectionName;
export const serviceAccountEmail = serviceAccount.email;
export const n8nUrl = pulumi.interpolate`${n8nService.uri}`;

// Export instructions
export const setupInstructions = pulumi.interpolate`
n8n has been deployed successfully!

1. Access n8n at: ${n8nService.uri}
2. On first access, you'll be prompted to create an admin account
3. Database: PostgreSQL instance '${dbInstance.name}' in region '${region}'
4. Service Account: ${serviceAccount.email}

Important Notes:
- The service scales to zero when idle to save costs
- Cold starts may take 10-30 seconds
- For production, consider setting minInstanceCount to 1
- Update the WEBHOOK_URL config if you have a custom domain

To update the webhook URL:
  pulumi config set webhookUrl https://your-custom-domain.com

To set minimum instances (prevent cold starts):
  Update the minInstanceCount in the scaling configuration
`;
