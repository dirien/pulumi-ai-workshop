import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Configuration
const OLLAMA_API_PORT = 11434;

// Get the current AWS region
const currentRegion = aws.getRegionOutput();

// Create VPC with DNS support and hostnames enabled
const vpc = new aws.ec2.Vpc("ollama-vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsSupport: true,
    enableDnsHostnames: true,
    tags: {
        Name: "ollama-vpc",
    },
});

// Create public subnet in the first availability zone
const publicSubnet = new aws.ec2.Subnet("ollama-public-subnet", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    availabilityZone: currentRegion.name.apply(region => `${region}a`),
    mapPublicIpOnLaunch: true,
    tags: {
        Name: "ollama-public-subnet",
    },
});

// Create Internet Gateway
const internetGateway = new aws.ec2.InternetGateway("ollama-igw", {
    vpcId: vpc.id,
    tags: {
        Name: "ollama-igw",
    },
});

// Create Route Table with default route to Internet Gateway
const routeTable = new aws.ec2.RouteTable("ollama-route-table", {
    vpcId: vpc.id,
    routes: [
        {
            cidrBlock: "0.0.0.0/0",
            gatewayId: internetGateway.id,
        },
    ],
    tags: {
        Name: "ollama-route-table",
    },
});

// Associate Route Table with public subnet
const routeTableAssociation = new aws.ec2.RouteTableAssociation("ollama-rta", {
    subnetId: publicSubnet.id,
    routeTableId: routeTable.id,
});

// Create Security Group
const securityGroup = new aws.ec2.SecurityGroup("ollama-sg", {
    vpcId: vpc.id,
    description: "Security group for Ollama GPU server",
    ingress: [
        {
            protocol: "tcp",
            fromPort: 22,
            toPort: 22,
            cidrBlocks: ["0.0.0.0/0"],
            description: "SSH access",
        },
        {
            protocol: "tcp",
            fromPort: OLLAMA_API_PORT,
            toPort: OLLAMA_API_PORT,
            cidrBlocks: ["0.0.0.0/0"],
            description: "Ollama API access",
        },
    ],
    egress: [
        {
            protocol: "-1",
            fromPort: 0,
            toPort: 0,
            cidrBlocks: ["0.0.0.0/0"],
            description: "Allow all outbound traffic",
        },
    ],
    tags: {
        Name: "ollama-sg",
    },
});

// Get the latest Amazon Linux 2 GPU AMI
const ami = aws.ec2.getAmiOutput({
    mostRecent: true,
    owners: ["amazon"],
    filters: [
        {
            name: "name",
            values: ["amzn2-ami-ecs-gpu-hvm-*-x86_64-ebs"],
        },
    ],
});

// User data script to install Docker and run Ollama
const userData = `#!/bin/bash
set -e
yum update -y
amazon-linux-extras install docker -y
systemctl enable docker
systemctl start docker
docker run -d --gpus all -v ollama:/root/.ollama -p ${OLLAMA_API_PORT}:${OLLAMA_API_PORT} \\
  --name ollama --restart always ollama/ollama
docker exec ollama ollama pull qwen3-coder:30b
`;

// Create EC2 instance
const instance = new aws.ec2.Instance("ollama-instance", {
    instanceType: "g4dn.xlarge",
    ami: ami.id,
    subnetId: publicSubnet.id,
    vpcSecurityGroupIds: [securityGroup.id],
    associatePublicIpAddress: true,
    rootBlockDevice: {
        volumeSize: 100,
        volumeType: "gp3",
    },
    userData: userData,
    tags: {
        Name: "ollama-instance",
    },
});

// Export outputs
export const publicIp = instance.publicIp;
export const ollamaApiUrl = pulumi.interpolate`http://${instance.publicIp}:${OLLAMA_API_PORT}`;
