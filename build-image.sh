#!/usr/bin/env sh

set -eu

ROOT_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
DOCKERFILE="${DOCKERFILE:-$ROOT_DIR/dev/build/Dockerfile}"
IMAGE_NAME="${IMAGE_NAME:-wiki-v2}"
IMAGE_TAG="${IMAGE_TAG:-local}"
PLATFORM="${PLATFORM:-}"
NO_CACHE="${NO_CACHE:-0}"

usage() {
  cat <<'EOF'
Usage: ./build-image.sh [docker build options...]

Environment variables:
  IMAGE_NAME   Image repository name (default: wiki-v2)
  IMAGE_TAG    Image tag (default: local)
  DOCKERFILE   Dockerfile path (default: dev/build/Dockerfile)
  PLATFORM     Optional target platform, e.g. linux/amd64
  NO_CACHE     Set to 1 to disable the Docker build cache
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed or is not available in PATH." >&2
  exit 1
fi

if [ ! -f "$DOCKERFILE" ]; then
  echo "Error: Dockerfile not found: $DOCKERFILE" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker daemon is not running or is not accessible." >&2
  exit 1
fi

image_ref="${IMAGE_NAME}:${IMAGE_TAG}"

if [ -n "$PLATFORM" ]; then
  set -- --platform "$PLATFORM" "$@"
fi

if [ "$NO_CACHE" = "1" ]; then
  set -- --no-cache "$@"
fi

echo "Building image: $image_ref"
echo "Dockerfile: $DOCKERFILE"
echo "Context: $ROOT_DIR"
echo "Runtime config template: $ROOT_DIR/dev/build/config.yml"
echo "The local config.yml is not embedded in the image."

docker build --file "$DOCKERFILE" --tag "$image_ref" "$@" "$ROOT_DIR"
