# Option 1: Using node:slim variant (Recommended for SharePoint development)
# This provides a good balance between security, compatibility, and ease of use
FROM node:20-bookworm-slim

# Install only essential tools needed for SharePoint development
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    curl \
    build-essential \
    python3 \
    libicu-dev \
    && rm -rf /var/lib/apt/lists/*

# Create workspace directory
WORKDIR /workspace

# Install global npm packages
RUN npm install -g \
    webpack@5 \
    webpack-cli@5 \
    gulp-cli \
    yo \
    @anthropic-ai/claude-code \
    azure-functions-core-tools@4

# The node user already exists in the base image with UID 1000
# Just ensure workspace ownership
RUN chown -R node:node /workspace

# Switch to non-root user
USER node

ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

EXPOSE 3000 9229

CMD ["/bin/bash"]