"""
Demo Strands Agent with Calculator Tool
This agent demonstrates basic conversational AI with tool usage.
"""
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent, tool
from strands.models import BedrockModel

# Initialize the AgentCore app
app = BedrockAgentCoreApp()


@tool
def calculator(operation: str, a: float, b: float) -> float:
    """
    Perform basic arithmetic operations.

    Args:
        operation: The operation to perform (add, subtract, multiply, divide)
        a: First number
        b: Second number

    Returns:
        The result of the operation
    """
    operations = {
        "add": lambda x, y: x + y,
        "subtract": lambda x, y: x - y,
        "multiply": lambda x, y: x * y,
        "divide": lambda x, y: x / y if y != 0 else float('inf')
    }

    if operation.lower() not in operations:
        raise ValueError(f"Unknown operation: {operation}")

    return operations[operation.lower()](a, b)


# Configure the Bedrock model
model_id = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
model = BedrockModel(model_id=model_id)

# Create the agent with the calculator tool
agent = Agent(
    model=model,
    tools=[calculator],
    system_prompt="You're a helpful calculator assistant. You can perform basic arithmetic operations.",
)


@app.entrypoint
def invoke(payload):
    """
    Main entrypoint for the agent.
    Processes incoming requests and returns agent responses.
    """
    user_message = payload.get("prompt", "Hello! How can I help you today?")

    # Invoke the agent with the user's message
    response = agent(user_message)

    return response.message['content'][0]['text']


if __name__ == "__main__":
    # Run the agent locally for testing
    app.run()
