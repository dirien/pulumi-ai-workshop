#!/usr/bin/env python3
"""
Test script for the deployed Bedrock AgentCore Runtime
This script invokes the agent with sample prompts to test the calculator tool
"""
import boto3
import json
import sys

# Agent Runtime ARN from Pulumi outputs
AGENT_RUNTIME_ARN = "arn:aws:bedrock-agentcore:us-west-2:052848974346:runtime/strands_demo_agent-afRxI8HYKF"
REGION = "us-west-2"

def invoke_agent(prompt: str) -> dict:
    """
    Invoke the agent with a prompt and return the response
    """
    client = boto3.client('bedrock-agentcore', region_name=REGION)

    payload = json.dumps({"prompt": prompt})

    print(f"\n🤖 Sending prompt: {prompt}")
    print("=" * 60)

    try:
        response = client.invoke_agent_runtime(
            agentRuntimeArn=AGENT_RUNTIME_ARN,
            contentType='application/json',
            accept='application/json',
            payload=payload.encode('utf-8')
        )

        # Read the streaming response
        result = response['payload'].read().decode('utf-8')
        result_json = json.loads(result)

        print(f"✅ Response: {json.dumps(result_json, indent=2)}")
        return result_json

    except Exception as e:
        print(f"❌ Error invoking agent: {str(e)}")
        return None


def main():
    """
    Run test scenarios for the calculator agent
    """
    print("🚀 Testing Bedrock AgentCore Calculator Agent")
    print("=" * 60)

    # Test scenarios
    test_prompts = [
        "What is 5 plus 3?",
        "Calculate 100 divided by 4",
        "What is 15 times 8?",
        "Subtract 25 from 100",
        "Hello! Can you help me with math?",
    ]

    # If a custom prompt is provided, use it
    if len(sys.argv) > 1:
        test_prompts = [" ".join(sys.argv[1:])]

    results = []
    for prompt in test_prompts:
        result = invoke_agent(prompt)
        results.append((prompt, result))
        print()

    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)

    success_count = sum(1 for _, r in results if r is not None)
    print(f"✅ Successful requests: {success_count}/{len(results)}")
    print(f"❌ Failed requests: {len(results) - success_count}/{len(results)}")


if __name__ == "__main__":
    main()
