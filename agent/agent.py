"""
Demo Strands Agent with Calculator Tool
This agent demonstrates basic conversational AI with tool usage.
"""
from bedrock_agentcore import BedrockAgentCoreApp
from strands import Agent, tool

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


# Create the agent with the calculator tool
agent = Agent(
    tools=[calculator],
    name="Demo Calculator Agent",
)


@app.entrypoint
def invoke(payload):
    """
    Main entrypoint for the agent.
    Processes incoming requests and returns agent responses.
    """
    user_message = payload.get("prompt", "Hello! How can I help you today?")
    
    # Invoke the agent with the user's message
    result = agent(user_message)
    
    return {
        "result": result.message
    }


if __name__ == "__main__":
    # Run the agent locally for testing
    app.run()
