import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as docker from "@pulumi/docker";

// Create a VPC with public and private subnets across 3 availability zones
// Tag subnets for EKS Auto Mode load balancer discovery
const vpc = new awsx.ec2.Vpc("eks-vpc", {
    cidrBlock: "10.0.0.0/16",
    numberOfAvailabilityZones: 3,
    subnetSpecs: [
        {
            type: awsx.ec2.SubnetType.Public,
            cidrMask: 20,
            tags: {
                "kubernetes.io/role/elb": "1",
            },
        },
        {
            type: awsx.ec2.SubnetType.Private,
            cidrMask: 20,
            tags: {
                "kubernetes.io/role/internal-elb": "1",
            },
        },
    ],
    natGateways: {
        strategy: awsx.ec2.NatGatewayStrategy.OnePerAz,
    },
    tags: {
        Name: "eks-vpc",
        Environment: "dev",
    },
});

// Create EKS cluster with Auto Mode enabled
const cluster = new eks.Cluster("eks-cluster", {
    vpcId: vpc.vpcId,
    publicSubnetIds: vpc.publicSubnetIds,
    privateSubnetIds: vpc.privateSubnetIds,
    // Enable EKS Auto Mode for automatic node management
    autoMode: {
        enabled: true,
    },
    // Authentication mode must support Access Entries for Auto Mode
    authenticationMode: eks.AuthenticationMode.Api,
    // Skip default node group and security group as Auto Mode manages these
    skipDefaultNodeGroup: true,
    createOidcProvider: true,
    tags: {
        Name: "eks-cluster",
        Environment: "dev",
    },
});

// Create Kubernetes provider using the cluster's kubeconfig
const k8sProvider = new k8s.Provider("k8s-provider", {
    kubeconfig: cluster.kubeconfig,
    enableServerSideApply: true,
});

// Get current AWS account and region
const current = aws.getCallerIdentityOutput();
const currentRegion = aws.getRegionOutput();

// Create IAM policy for AWS Load Balancer Controller
const lbControllerPolicy = new aws.iam.Policy("aws-load-balancer-controller-policy", {
    policy: pulumi.output(cluster.core).apply(core => JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Action: [
                    "iam:CreateServiceLinkedRole",
                ],
                Resource: "*",
                Condition: {
                    StringEquals: {
                        "iam:AWSServiceName": "elasticloadbalancing.amazonaws.com"
                    }
                }
            },
            {
                Effect: "Allow",
                Action: [
                    "ec2:DescribeAccountAttributes",
                    "ec2:DescribeAddresses",
                    "ec2:DescribeAvailabilityZones",
                    "ec2:DescribeInternetGateways",
                    "ec2:DescribeVpcs",
                    "ec2:DescribeVpcPeeringConnections",
                    "ec2:DescribeSubnets",
                    "ec2:DescribeSecurityGroups",
                    "ec2:DescribeInstances",
                    "ec2:DescribeNetworkInterfaces",
                    "ec2:DescribeTags",
                    "ec2:GetCoipPoolUsage",
                    "ec2:DescribeCoipPools",
                    "elasticloadbalancing:DescribeLoadBalancers",
                    "elasticloadbalancing:DescribeLoadBalancerAttributes",
                    "elasticloadbalancing:DescribeListeners",
                    "elasticloadbalancing:DescribeListenerCertificates",
                    "elasticloadbalancing:DescribeSSLPolicies",
                    "elasticloadbalancing:DescribeRules",
                    "elasticloadbalancing:DescribeTargetGroups",
                    "elasticloadbalancing:DescribeTargetGroupAttributes",
                    "elasticloadbalancing:DescribeTargetHealth",
                    "elasticloadbalancing:DescribeTags"
                ],
                Resource: "*"
            },
            {
                Effect: "Allow",
                Action: [
                    "cognito-idp:DescribeUserPoolClient",
                    "acm:ListCertificates",
                    "acm:DescribeCertificate",
                    "iam:ListServerCertificates",
                    "iam:GetServerCertificate",
                    "waf-regional:GetWebACL",
                    "waf-regional:GetWebACLForResource",
                    "waf-regional:AssociateWebACL",
                    "waf-regional:DisassociateWebACL",
                    "wafv2:GetWebACL",
                    "wafv2:GetWebACLForResource",
                    "wafv2:AssociateWebACL",
                    "wafv2:DisassociateWebACL",
                    "shield:GetSubscriptionState",
                    "shield:DescribeProtection",
                    "shield:CreateProtection",
                    "shield:DeleteProtection"
                ],
                Resource: "*"
            },
            {
                Effect: "Allow",
                Action: [
                    "ec2:AuthorizeSecurityGroupIngress",
                    "ec2:RevokeSecurityGroupIngress",
                    "ec2:CreateSecurityGroup"
                ],
                Resource: "*"
            },
            {
                Effect: "Allow",
                Action: [
                    "ec2:CreateTags"
                ],
                Resource: "arn:aws:ec2:*:*:security-group/*",
                Condition: {
                    StringEquals: {
                        "ec2:CreateAction": "CreateSecurityGroup"
                    },
                    Null: {
                        "aws:RequestTag/elbv2.k8s.aws/cluster": "false"
                    }
                }
            },
            {
                Effect: "Allow",
                Action: [
                    "ec2:CreateTags",
                    "ec2:DeleteTags"
                ],
                Resource: "arn:aws:ec2:*:*:security-group/*",
                Condition: {
                    Null: {
                        "aws:RequestTag/elbv2.k8s.aws/cluster": "true",
                        "aws:ResourceTag/elbv2.k8s.aws/cluster": "false"
                    }
                }
            },
            {
                Effect: "Allow",
                Action: [
                    "ec2:AuthorizeSecurityGroupIngress",
                    "ec2:RevokeSecurityGroupIngress",
                    "ec2:DeleteSecurityGroup"
                ],
                Resource: "*",
                Condition: {
                    Null: {
                        "aws:ResourceTag/elbv2.k8s.aws/cluster": "false"
                    }
                }
            },
            {
                Effect: "Allow",
                Action: [
                    "elasticloadbalancing:CreateLoadBalancer",
                    "elasticloadbalancing:CreateTargetGroup"
                ],
                Resource: "*",
                Condition: {
                    Null: {
                        "aws:RequestTag/elbv2.k8s.aws/cluster": "false"
                    }
                }
            },
            {
                Effect: "Allow",
                Action: [
                    "elasticloadbalancing:CreateListener",
                    "elasticloadbalancing:DeleteListener",
                    "elasticloadbalancing:CreateRule",
                    "elasticloadbalancing:DeleteRule"
                ],
                Resource: "*"
            },
            {
                Effect: "Allow",
                Action: [
                    "elasticloadbalancing:AddTags",
                    "elasticloadbalancing:RemoveTags"
                ],
                Resource: [
                    "arn:aws:elasticloadbalancing:*:*:targetgroup/*/*",
                    "arn:aws:elasticloadbalancing:*:*:loadbalancer/net/*/*",
                    "arn:aws:elasticloadbalancing:*:*:loadbalancer/app/*/*"
                ],
                Condition: {
                    Null: {
                        "aws:RequestTag/elbv2.k8s.aws/cluster": "true",
                        "aws:ResourceTag/elbv2.k8s.aws/cluster": "false"
                    }
                }
            },
            {
                Effect: "Allow",
                Action: [
                    "elasticloadbalancing:AddTags",
                    "elasticloadbalancing:RemoveTags"
                ],
                Resource: [
                    "arn:aws:elasticloadbalancing:*:*:listener/net/*/*/*",
                    "arn:aws:elasticloadbalancing:*:*:listener/app/*/*/*",
                    "arn:aws:elasticloadbalancing:*:*:listener-rule/net/*/*/*",
                    "arn:aws:elasticloadbalancing:*:*:listener-rule/app/*/*/*"
                ]
            },
            {
                Effect: "Allow",
                Action: [
                    "elasticloadbalancing:ModifyLoadBalancerAttributes",
                    "elasticloadbalancing:SetIpAddressType",
                    "elasticloadbalancing:SetSecurityGroups",
                    "elasticloadbalancing:SetSubnets",
                    "elasticloadbalancing:DeleteLoadBalancer",
                    "elasticloadbalancing:ModifyTargetGroup",
                    "elasticloadbalancing:ModifyTargetGroupAttributes",
                    "elasticloadbalancing:DeleteTargetGroup"
                ],
                Resource: "*",
                Condition: {
                    Null: {
                        "aws:ResourceTag/elbv2.k8s.aws/cluster": "false"
                    }
                }
            },
            {
                Effect: "Allow",
                Action: [
                    "elasticloadbalancing:AddTags"
                ],
                Resource: [
                    "arn:aws:elasticloadbalancing:*:*:targetgroup/*/*",
                    "arn:aws:elasticloadbalancing:*:*:loadbalancer/net/*/*",
                    "arn:aws:elasticloadbalancing:*:*:loadbalancer/app/*/*"
                ],
                Condition: {
                    StringEquals: {
                        "elasticloadbalancing:CreateAction": [
                            "CreateTargetGroup",
                            "CreateLoadBalancer"
                        ]
                    },
                    Null: {
                        "aws:RequestTag/elbv2.k8s.aws/cluster": "false"
                    }
                }
            },
            {
                Effect: "Allow",
                Action: [
                    "elasticloadbalancing:RegisterTargets",
                    "elasticloadbalancing:DeregisterTargets"
                ],
                Resource: "arn:aws:elasticloadbalancing:*:*:targetgroup/*/*"
            },
            {
                Effect: "Allow",
                Action: [
                    "elasticloadbalancing:SetWebAcl",
                    "elasticloadbalancing:ModifyListener",
                    "elasticloadbalancing:AddListenerCertificates",
                    "elasticloadbalancing:RemoveListenerCertificates",
                    "elasticloadbalancing:ModifyRule"
                ],
                Resource: "*"
            }
        ]
    })),
});

// Create IAM role for AWS Load Balancer Controller with IRSA
const lbControllerRole = new aws.iam.Role("aws-load-balancer-controller-role", {
    assumeRolePolicy: pulumi.all([
        cluster.core.apply(c => c.oidcProvider?.url || ""),
        cluster.core.apply(c => c.oidcProvider?.arn || ""),
        current.accountId
    ]).apply(([oidcUrl, oidcArn, accountId]) => {
        const oidcProvider = oidcUrl.replace("https://", "");
        
        return JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Principal: {
                    Federated: oidcArn
                },
                Action: "sts:AssumeRoleWithWebIdentity",
                Condition: {
                    StringEquals: {
                        [`${oidcProvider}:sub`]: "system:serviceaccount:kube-system:aws-load-balancer-controller",
                        [`${oidcProvider}:aud`]: "sts.amazonaws.com"
                    }
                }
            }]
        });
    }),
});

// Attach policy to role
const lbControllerRolePolicyAttachment = new aws.iam.RolePolicyAttachment("aws-load-balancer-controller-attachment", {
    role: lbControllerRole.name,
    policyArn: lbControllerPolicy.arn,
});

// Install Gateway API CRDs
const gatewayApiCrds = new k8s.yaml.ConfigFile("gateway-api-crds", {
    file: "https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.1/standard-install.yaml",
}, { provider: k8sProvider, dependsOn: [cluster] });

// Install AWS Load Balancer Controller using Helm
const awsLbController = new k8s.helm.v3.Release("aws-load-balancer-controller", {
    chart: "aws-load-balancer-controller",
    repositoryOpts: {
        repo: "https://aws.github.io/eks-charts",
    },
    namespace: "kube-system",
    values: {
        clusterName: cluster.eksCluster.name,
        serviceAccount: {
            create: true,
            name: "aws-load-balancer-controller",
            annotations: {
                "eks.amazonaws.com/role-arn": lbControllerRole.arn,
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [gatewayApiCrds, lbControllerRolePolicyAttachment] });

// Create ECR repositories for backend and frontend
const backendRepo = new aws.ecr.Repository("backend-repo", {
    name: "backend-api",
    forceDelete: true,
    imageScanningConfiguration: {
        scanOnPush: true,
    },
});

const frontendRepo = new aws.ecr.Repository("frontend-repo", {
    name: "frontend-app",
    forceDelete: true,
    imageScanningConfiguration: {
        scanOnPush: true,
    },
});

// Build and push Docker images to ECR
const backendImage = new docker.Image("backend-image", {
    imageName: backendRepo.repositoryUrl,
    build: {
        context: "./backend",
        platform: "linux/amd64",
    },
});

const frontendImage = new docker.Image("frontend-image", {
    imageName: frontendRepo.repositoryUrl,
    build: {
        context: "./frontend",
        platform: "linux/amd64",
    },
});

// Deploy backend API to Kubernetes
const backendNamespace = new k8s.core.v1.Namespace("backend-namespace", {
    metadata: {
        name: "backend",
    },
}, { provider: k8sProvider });

const backendDeployment = new k8s.apps.v1.Deployment("backend-deployment", {
    metadata: {
        name: "backend-api",
        namespace: backendNamespace.metadata.name,
        labels: {
            app: "backend-api",
        },
    },
    spec: {
        replicas: 2,
        selector: {
            matchLabels: {
                app: "backend-api",
            },
        },
        template: {
            metadata: {
                labels: {
                    app: "backend-api",
                },
            },
            spec: {
                containers: [{
                    name: "backend",
                    image: backendImage.imageName,
                    ports: [{
                        containerPort: 3000,
                    }],
                    env: [
                        {
                            name: "NODE_ENV",
                            value: "production",
                        },
                        {
                            name: "POD_NAME",
                            valueFrom: {
                                fieldRef: {
                                    fieldPath: "metadata.name",
                                },
                            },
                        },
                        {
                            name: "POD_NAMESPACE",
                            valueFrom: {
                                fieldRef: {
                                    fieldPath: "metadata.namespace",
                                },
                            },
                        },
                        {
                            name: "POD_IP",
                            valueFrom: {
                                fieldRef: {
                                    fieldPath: "status.podIP",
                                },
                            },
                        },
                    ],
                    resources: {
                        requests: {
                            cpu: "100m",
                            memory: "128Mi",
                        },
                        limits: {
                            cpu: "500m",
                            memory: "512Mi",
                        },
                    },
                    livenessProbe: {
                        httpGet: {
                            path: "/health",
                            port: 3000,
                        },
                        initialDelaySeconds: 10,
                        periodSeconds: 10,
                    },
                    readinessProbe: {
                        httpGet: {
                            path: "/health",
                            port: 3000,
                        },
                        initialDelaySeconds: 5,
                        periodSeconds: 5,
                    },
                }],
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [backendImage] });

const backendService = new k8s.core.v1.Service("backend-service", {
    metadata: {
        name: "backend-service",
        namespace: backendNamespace.metadata.name,
    },
    spec: {
        selector: {
            app: "backend-api",
        },
        ports: [{
            port: 3000,
            targetPort: 3000,
            protocol: "TCP",
        }],
        type: "ClusterIP",
    },
}, { provider: k8sProvider });

const backendHpa = new k8s.autoscaling.v2.HorizontalPodAutoscaler("backend-hpa", {
    metadata: {
        name: "backend-hpa",
        namespace: backendNamespace.metadata.name,
    },
    spec: {
        scaleTargetRef: {
            apiVersion: "apps/v1",
            kind: "Deployment",
            name: "backend-api",
        },
        minReplicas: 2,
        maxReplicas: 10,
        metrics: [{
            type: "Resource",
            resource: {
                name: "cpu",
                target: {
                    type: "Utilization",
                    averageUtilization: 70,
                },
            },
        }],
    },
}, { provider: k8sProvider, dependsOn: [backendDeployment] });

// Deploy frontend to Kubernetes
const frontendNamespace = new k8s.core.v1.Namespace("frontend-namespace", {
    metadata: {
        name: "frontend",
    },
}, { provider: k8sProvider });

const frontendDeployment = new k8s.apps.v1.Deployment("frontend-deployment", {
    metadata: {
        name: "frontend-app",
        namespace: frontendNamespace.metadata.name,
        labels: {
            app: "frontend-app",
        },
    },
    spec: {
        replicas: 2,
        selector: {
            matchLabels: {
                app: "frontend-app",
            },
        },
        template: {
            metadata: {
                labels: {
                    app: "frontend-app",
                },
            },
            spec: {
                containers: [{
                    name: "frontend",
                    image: frontendImage.imageName,
                    ports: [{
                        containerPort: 8080,
                    }],
                    resources: {
                        requests: {
                            cpu: "50m",
                            memory: "64Mi",
                        },
                        limits: {
                            cpu: "200m",
                            memory: "256Mi",
                        },
                    },
                    livenessProbe: {
                        httpGet: {
                            path: "/health",
                            port: 8080,
                        },
                        initialDelaySeconds: 10,
                        periodSeconds: 10,
                    },
                    readinessProbe: {
                        httpGet: {
                            path: "/health",
                            port: 8080,
                        },
                        initialDelaySeconds: 5,
                        periodSeconds: 5,
                    },
                }],
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [frontendImage] });

const frontendService = new k8s.core.v1.Service("frontend-service", {
    metadata: {
        name: "frontend-service",
        namespace: frontendNamespace.metadata.name,
    },
    spec: {
        selector: {
            app: "frontend-app",
        },
        ports: [{
            port: 80,
            targetPort: 8080,
            protocol: "TCP",
        }],
        type: "ClusterIP",
    },
}, { provider: k8sProvider });

// Create Gateway and HTTPRoute for frontend
const gateway = new k8s.apiextensions.CustomResource("frontend-gateway", {
    apiVersion: "gateway.networking.k8s.io/v1",
    kind: "Gateway",
    metadata: {
        name: "frontend-gateway",
        namespace: frontendNamespace.metadata.name,
        annotations: {
            "alb.ingress.kubernetes.io/scheme": "internet-facing",
            "alb.ingress.kubernetes.io/target-type": "ip",
        },
    },
    spec: {
        gatewayClassName: "amazon-vpc-lattice",
        listeners: [{
            name: "http",
            protocol: "HTTP",
            port: 80,
        }],
    },
}, { provider: k8sProvider, dependsOn: [awsLbController, gatewayApiCrds] });

const httpRoute = new k8s.apiextensions.CustomResource("frontend-httproute", {
    apiVersion: "gateway.networking.k8s.io/v1",
    kind: "HTTPRoute",
    metadata: {
        name: "frontend-route",
        namespace: frontendNamespace.metadata.name,
    },
    spec: {
        parentRefs: [{
            name: "frontend-gateway",
        }],
        rules: [{
            matches: [{
                path: {
                    type: "PathPrefix",
                    value: "/",
                },
            }],
            backendRefs: [{
                name: "frontend-service",
                port: 80,
            }],
        }],
    },
}, { provider: k8sProvider, dependsOn: [gateway, frontendService] });

// Export cluster information
export const vpcId = vpc.vpcId;
export const publicSubnetIds = vpc.publicSubnetIds;
export const privateSubnetIds = vpc.privateSubnetIds;
export const clusterName = cluster.eksCluster.name;
export const kubeconfig = cluster.kubeconfig;
export const backendImageUri = backendImage.imageName;
export const frontendImageUri = frontendImage.imageName;
export const gatewayName = gateway.metadata.name;
