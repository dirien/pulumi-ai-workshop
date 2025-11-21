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
        platform: "linux/amd64", // AgentCore requires amd64
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
    },
}, {
    dependsOn: [agentRolePolicy, bedrockRolePolicy],
});

// Export the repository URL and image name
export const repositoryUrl = repo.repositoryUrl;
export const imageUri = image.imageName;
export const agentRoleArn = agentRole.arn;
export const agentRuntimeId = agentRuntime.agentRuntimeId;
export const agentRuntimeArn = agentRuntime.agentRuntimeArn;
