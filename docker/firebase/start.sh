#!/bin/sh
# Start the emulators, restoring data saved by a previous run. /data is a docker volume;
# export into a subdirectory because the emulator replaces the target dir via rename(),
# which fails on a mount point.
set -e
DATA_DIR=/data/export
IMPORT=""
if [ -f "$DATA_DIR/firebase-export-metadata.json" ]; then
  IMPORT="--import=$DATA_DIR"
fi
exec firebase emulators:start --project demo-civiccircle --only auth,firestore,storage \
  $IMPORT --export-on-exit="$DATA_DIR"
