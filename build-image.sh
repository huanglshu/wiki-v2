#!/usr/bin/env sh

set -eu

ROOT_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
VERSION="$(node -p 'require(process.argv[1]).version' "$ROOT_DIR/package.json")"
DOCKERFILE="$ROOT_DIR/dev/build/Dockerfile"
IMAGE_NAME="harbor.gdalpha.com/alpha-tools/wiki2"
IMAGE_TAG="lsh.${VERSION}"
image_ref="${IMAGE_NAME}:${IMAGE_TAG}"


echo "Building image: $image_ref"
echo "Dockerfile: $DOCKERFILE"
echo "Context: $ROOT_DIR"
echo "Runtime config template: $ROOT_DIR/dev/build/config.yml"
echo "The local config.yml is not embedded in the image."

DOCKER_BUILDKIT=1 docker build --file "$DOCKERFILE" --tag "$image_ref" "$@" "$ROOT_DIR"
docker push "$image_ref"
