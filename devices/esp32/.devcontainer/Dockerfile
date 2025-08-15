FROM debian:stable-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv git curl gcc g++ make sudo \
 && rm -rf /var/lib/apt/lists/*

# Install PlatformIO
RUN pip3 install --break-system-packages -U platformio

# Create non-root user 'vscode'
RUN useradd -m vscode \
 && echo "vscode ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/vscode \
 && chmod 0440 /etc/sudoers.d/vscode

WORKDIR /workspace

ENTRYPOINT ["/bin/bash"]
