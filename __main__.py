"""A Kubernetes Python Pulumi program for deploying Nginx"""

import pulumi
from pulumi_kubernetes.apps.v1 import Deployment, DeploymentSpecArgs
from pulumi_kubernetes.core.v1 import (
    ContainerArgs,
    ContainerPortArgs,
    PodSpecArgs,
    PodTemplateSpecArgs,
    ResourceRequirementsArgs,
    Service,
    ServicePortArgs,
    ServiceSpecArgs,
)
from pulumi_kubernetes.meta.v1 import LabelSelectorArgs, ObjectMetaArgs

# Configuration
config = pulumi.Config()
replicas = config.get_int("replicas") or 2
nginx_image = config.get("nginx_image") or "nginx:latest"

# Labels for the deployment
app_labels = {"app": "nginx"}

# Create the Nginx deployment
deployment = Deployment(
    "nginx-deployment",
    metadata=ObjectMetaArgs(
        name="nginx-deployment",
        labels=app_labels,
    ),
    spec=DeploymentSpecArgs(
        replicas=replicas,
        selector=LabelSelectorArgs(
            match_labels=app_labels,
        ),
        template=PodTemplateSpecArgs(
            metadata=ObjectMetaArgs(
                labels=app_labels,
            ),
            spec=PodSpecArgs(
                containers=[
                    ContainerArgs(
                        name="nginx",
                        image=nginx_image,
                        ports=[
                            ContainerPortArgs(
                                container_port=80,
                                name="http",
                            ),
                        ],
                        resources=ResourceRequirementsArgs(
                            requests={
                                "cpu": "100m",
                                "memory": "128Mi",
                            },
                            limits={
                                "cpu": "200m",
                                "memory": "256Mi",
                            },
                        ),
                    ),
                ],
            ),
        ),
    ),
)

# Create a Service to expose the Nginx deployment
service = Service(
    "nginx-service",
    metadata=ObjectMetaArgs(
        name="nginx-service",
        labels=app_labels,
    ),
    spec=ServiceSpecArgs(
        type="LoadBalancer",
        selector=app_labels,
        ports=[
            ServicePortArgs(
                port=80,
                target_port="http",
                protocol="TCP",
                name="http",
            ),
        ],
    ),
)

# Export the deployment name and service information
pulumi.export("deployment_name", deployment.metadata.apply(lambda m: m.name))
pulumi.export("service_name", service.metadata.apply(lambda m: m.name))
pulumi.export(
    "service_url",
    service.status.apply(
        lambda status: (
            f"http://{status.load_balancer.ingress[0].ip}"
            if status
            and status.load_balancer
            and status.load_balancer.ingress
            and len(status.load_balancer.ingress) > 0
            else "Pending"
        )
    ),
)
