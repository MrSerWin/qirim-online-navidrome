#!/usr/bin/env sh

set -e

export WORKBOX_DIR=public/3rdparty/workbox

rm -rf ${WORKBOX_DIR}
workbox copyLibraries build/3rdparty/

mkdir -p ${WORKBOX_DIR}
# Copy (not move) so files remain in build/3rdparty for Go embedding
cp build/3rdparty/workbox-*/workbox-sw.js ${WORKBOX_DIR}
cp build/3rdparty/workbox-*/workbox-core.prod.js ${WORKBOX_DIR}
cp build/3rdparty/workbox-*/workbox-strategies.prod.js ${WORKBOX_DIR}
cp build/3rdparty/workbox-*/workbox-routing.prod.js ${WORKBOX_DIR}
cp build/3rdparty/workbox-*/workbox-navigation-preload.prod.js ${WORKBOX_DIR}
cp build/3rdparty/workbox-*/workbox-precaching.prod.js ${WORKBOX_DIR}
cp build/3rdparty/workbox-*/workbox-expiration.prod.js ${WORKBOX_DIR}
# Keep the build/3rdparty/workbox-* directory for Go embedding
