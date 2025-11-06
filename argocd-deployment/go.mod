module argocd-deployment

go 1.23

require (
	github.com/ediri/pulumi-argocd-component/sdk/go v0.0.0
	github.com/pulumi/pulumi-kubernetes/sdk/v4 v4.23.0
	github.com/pulumi/pulumi/sdk/v3 v3.206.0
)

replace github.com/ediri/pulumi-argocd-component/sdk/go => ./sdks/ediri-argocd-component
