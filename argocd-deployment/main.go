package main

import (
	"github.com/ediri/pulumi-argocd-component/sdk/go/argocdcomponent"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Deploy ArgoCD using the private registry component
		_, err := argocdcomponent.NewArgoCDComponent(ctx, "argocd", nil)
		if err != nil {
			return err
		}

		return nil
	})
}
