# Use Python 3.11 slim image for smaller size
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent code
COPY agent.py .

# Expose port 8080 (AgentCore default)
EXPOSE 8080

# Run the agent
CMD ["python", "-u", "agent.py"]
