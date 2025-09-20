FROM alpine:latest

WORKDIR /workspaces/heatsync

RUN ln -snf /usr/share/zoneinfo/UTC /etc/localtime && echo UTC > /etc/timezone

RUN apk add --no-cache --update \
    curl git bash sudo make tmux \
    nodejs npm deno \
    postgresql-client

ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN addgroup -g $USER_GID $USERNAME \
    && adduser -D -s /bin/bash -G $USERNAME -u $USER_UID $USERNAME \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

RUN addgroup -g 997 docker || true \
    && addgroup $USERNAME docker

USER $USERNAME

SHELL ["/bin/bash", "-c"]