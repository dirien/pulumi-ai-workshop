import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as docker from "@pulumi/docker";

// Create an ECR repository for the agent container
const repo = new aws.ecr.Repository("strands-agent-repo", {
    name: "strands-agent-demo",
    forceDelete: true, // Allow deletion even with images
});

// Get ECR authorization credentials
const authToken = aws.ecr.getAuthorizationTokenOutput({
    registryId: repo.registryId,
});

// Build and push the Docker image to ECR
const image = new docker.Image("strands-agent-image", {
    imageName: pulumi.interpolate`${repo.repositoryUrl}:latest`,
    build: {
        context: "./agent",
        dockerfile: "./agent/Dockerfile",
        platform: "linux/arm64", // AgentCore requires arm64
    },
    registry: {
        server: repo.repositoryUrl,
        username: authToken.userName,
        password: authToken.password,
    },
});

// Create IAM role for AgentCore runtime
const agentRoleAssumeRolePolicy = aws.iam.getPolicyDocumentOutput({
    statements: [{
        effect: "Allow",
        actions: ["sts:AssumeRole"],
        principals: [{
            type: "Service",
            identifiers: ["bedrock-agentcore.amazonaws.com"],
        }],
    }],
});

const agentRole = new aws.iam.Role("agentcore-runtime-role", {
    name: "strands-agent-runtime-role",
    assumeRolePolicy: agentRoleAssumeRolePolicy.json,
});

// Create policy for ECR access
const ecrPolicy = aws.iam.getPolicyDocumentOutput({
    statements: [
        {
            effect: "Allow",
            actions: ["ecr:GetAuthorizationToken"],
            resources: ["*"],
        },
        {
            effect: "Allow",
            actions: [
                "ecr:BatchGetImage",
                "ecr:GetDownloadUrlForLayer",
            ],
            resources: [repo.arn],
        },
    ],
});

const agentRolePolicy = new aws.iam.RolePolicy("agentcore-ecr-policy", {
    role: agentRole.id,
    policy: ecrPolicy.json,
});

// Add Bedrock model access policy
const bedrockPolicy = aws.iam.getPolicyDocumentOutput({
    statements: [{
        effect: "Allow",
        actions: [
            "bedrock:InvokeModel",
            "bedrock:InvokeModelWithResponseStream",
        ],
        resources: ["*"],
    }],
});

const bedrockRolePolicy = new aws.iam.RolePolicy("agentcore-bedrock-policy", {
    role: agentRole.id,
    policy: bedrockPolicy.json,
});

// Add comprehensive CloudWatch Logs permissions
const logsPolicy = aws.iam.getPolicyDocumentOutput({
    statements: [
        {
            effect: "Allow",
            actions: [
                "logs:DescribeLogStreams",
                "logs:CreateLogGroup",
            ],
            resources: ["arn:aws:logs:*:*:log-group:/aws/bedrock-agentcore/runtimes/*"],
        },
        {
            effect: "Allow",
            actions: ["logs:DescribeLogGroups"],
            resources: ["arn:aws:logs:*:*:log-group:*"],
        },
        {
            effect: "Allow",
            actions: [
                "logs:CreateLogStream",
                "logs:PutLogEvents",
            ],
            resources: ["arn:aws:logs:*:*:log-group:/aws/bedrock-agentcore/runtimes/*:log-stream:*"],
        },
    ],
});

const logsRolePolicy = new aws.iam.RolePolicy("agentcore-logs-policy", {
    role: agentRole.id,
    policy: logsPolicy.json,
});

// Add X-Ray tracing permissions
const xrayPolicy = aws.iam.getPolicyDocumentOutput({
    statements: [{
        effect: "Allow",
        actions: [
            "xray:PutTraceSegments",
            "xray:PutTelemetryRecords",
            "xray:GetSamplingRules",
            "xray:GetSamplingTargets",
        ],
        resources: ["*"],
    }],
});

const xrayRolePolicy = new aws.iam.RolePolicy("agentcore-xray-policy", {
    role: agentRole.id,
    policy: xrayPolicy.json,
});

// Add CloudWatch Metrics permissions
const metricsPolicy = aws.iam.getPolicyDocumentOutput({
    statements: [{
        effect: "Allow",
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: [{
            test: "StringEquals",
            variable: "cloudwatch:namespace",
            values: ["bedrock-agentcore"],
        }],
    }],
});

const metricsRolePolicy = new aws.iam.RolePolicy("agentcore-metrics-policy", {
    role: agentRole.id,
    policy: metricsPolicy.json,
});

// Add Workload Identity permissions
const workloadIdentityPolicy = aws.iam.getPolicyDocumentOutput({
    statements: [{
        effect: "Allow",
        actions: [
            "bedrock-agentcore:GetWorkloadAccessToken",
            "bedrock-agentcore:GetWorkloadAccessTokenForJWT",
            "bedrock-agentcore:GetWorkloadAccessTokenForUserId",
        ],
        resources: [
            "arn:aws:bedrock-agentcore:*:*:workload-identity-directory/default",
            "arn:aws:bedrock-agentcore:*:*:workload-identity-directory/default/workload-identity/*",
        ],
    }],
});

const workloadIdentityRolePolicy = new aws.iam.RolePolicy("agentcore-workload-identity-policy", {
    role: agentRole.id,
    policy: workloadIdentityPolicy.json,
});

// Deploy the AgentCore Agent Runtime
const agentRuntime = new aws.bedrock.AgentcoreAgentRuntime("strands-agent-runtime", {
    agentRuntimeName: "strands_demo_agent",
    description: "Demo Strands agent with calculator tool",
    roleArn: agentRole.arn,
    agentRuntimeArtifact: {
        containerConfiguration: {
            containerUri: image.imageName,
        },
    },
    networkConfiguration: {
        networkMode: "PUBLIC",
    },
    environmentVariables: {
        LOG_LEVEL: "INFO",
        UPDATED_AT: new Date().toISOString(),
    },
}, {
    dependsOn: [agentRolePolicy, bedrockRolePolicy, logsRolePolicy, xrayRolePolicy, metricsRolePolicy, workloadIdentityRolePolicy],
});

// Create an endpoint for the agent runtime
const agentEndpoint = new aws.bedrock.AgentcoreAgentRuntimeEndpoint("strands-agent-endpoint", {
    agentRuntimeId: agentRuntime.agentRuntimeId,
    agentRuntimeVersion: agentRuntime.agentRuntimeVersion,
    name: "strands_agent_endpoint",
    description: "Public endpoint for the Strands demo agent",
}, {
    dependsOn: [agentRuntime],
});

// Export the repository URL and image name
export const repositoryUrl = repo.repositoryUrl;
export const imageUri = image.imageName;
export const agentRoleArn = agentRole.arn;
export const agentRuntimeId = agentRuntime.agentRuntimeId;
export const agentRuntimeArn = agentRuntime.agentRuntimeArn;
export const agentEndpointArn = agentEndpoint.agentRuntimeEndpointArn;
export const agentEndpointId = agentEndpoint.id;
