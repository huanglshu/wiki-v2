#!/usr/bin/env sh

set -eu

ROOT_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

EXPECTED_NODE="$(tr -d '\r\n' < .nvmrc)"
ACTUAL_NODE="$(node --version 2>/dev/null || true)"
case "$ACTUAL_NODE" in
  "v${EXPECTED_NODE}".*) ;;
  *)
    echo "Expected Node.js ${EXPECTED_NODE}.x, but found ${ACTUAL_NODE:-none}." >&2
    echo "Install and select Node.js ${EXPECTED_NODE}.x, then run this script again." >&2
    exit 1
    ;;
esac

if [ ! -x node_modules/.bin/webpack ] && [ ! -f node_modules/.bin/webpack.cmd ]; then
  echo "Build dependencies are missing. Run yarn install --frozen-lockfile first." >&2
  exit 1
fi

VERSION="$(node -p 'require("./package.json").version')"
IMAGE_NAME="${IMAGE_NAME:-harbor.gdalpha.com/alpha-tools/wiki2}"
IMAGE_TAG="${IMAGE_TAG:-lsh.${VERSION}}"
IMAGE_REF="${IMAGE_NAME}:${IMAGE_TAG}"

echo "Building frontend assets locally with yarn build..."
echo "This rebuilds assets/ and the generated server view templates."
yarn build

for artifact in assets server/views/master.pug server/views/legacy/master.pug server/views/setup.pug; do
  if [ ! -e "$artifact" ]; then
    echo "Missing build output: $artifact" >&2
    exit 1
  fi
done

BUILD_CONTEXT="$(mktemp -d "${TMPDIR:-/tmp}/wiki-image-build.XXXXXXXX")"
trap 'rm -rf "$BUILD_CONTEXT"' EXIT
trap 'exit 1' HUP INT TERM

mkdir -p "$BUILD_CONTEXT/data" "$BUILD_CONTEXT/dev/build"
cp -R assets server patches "$BUILD_CONTEXT/"
cp -R data/sideload "$BUILD_CONTEXT/data/"
cp package.json yarn.lock LICENSE "$BUILD_CONTEXT/"
cp dev/build/config.yml dev/build/Dockerfile.local "$BUILD_CONTEXT/dev/build/"
cp dev/build/Dockerfile.local.dockerignore "$BUILD_CONTEXT/.dockerignore"
node -e 'const fs = require("fs"); const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")); pkg.version = "0.0.0"; fs.writeFileSync(process.argv[1], JSON.stringify(pkg, null, 2) + "\n")' "$BUILD_CONTEXT/dependency-package.json"

echo "Building image: $IMAGE_REF"
echo "The local config.yml and node_modules are not embedded in the image."
DOCKER_BUILDKIT=1 docker build --file "$BUILD_CONTEXT/dev/build/Dockerfile.local" --tag "$IMAGE_REF" "$@" "$BUILD_CONTEXT"
echo "Built image: $IMAGE_REF"
echo "Pushing image: $IMAGE_REF"
docker push "$IMAGE_REF"
echo "Pushed image: $IMAGE_REF"
