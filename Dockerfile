# Two stages: Node builds the static site, then a small nginx image serves it. The final
# image holds only nginx and the built files: no Node, no source code, no dependencies.
#
# The base images are the official Node and nginx images, pulled from their copies on
# Amazon ECR Public rather than from Docker Hub. On Windows and macOS, `podman compose`
# hands the build to Docker's compose tool, which sends Podman an empty Docker Hub login;
# Podman then fails every Docker Hub pull with "incorrect username or password". Pulls from
# ECR Public work anonymously with Docker and Podman alike, and avoid Docker Hub's limits on
# anonymous downloads. Names are written in full because Podman, unlike Docker, does not
# assume a registry for short names.

# ---- Build ---------------------------------------------------------------------------
FROM public.ecr.aws/docker/library/node:24-alpine AS build
WORKDIR /app

# Dependencies first: this layer is reused until package.json or the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Optional personal NASA API key (see .env.example); compose passes it from .env. Vite
# writes it into the JavaScript at build time, so it is readable by anyone who loads the
# app either way. Without it the app uses NASA's shared, rate-limited DEMO_KEY.
#
# A build argument reaches RUN commands as an environment variable by itself. It must not
# be written into the command: the build log prints commands with their values filled in.
ARG VITE_NASA_API_KEY=""
RUN npm run build

# ---- Serve ---------------------------------------------------------------------------
# nginx running as a regular user instead of root, listening on 8080.
FROM public.ecr.aws/nginx/nginx-unprivileged:1.30-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
