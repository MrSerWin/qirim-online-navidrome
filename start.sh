#!/bin/bash

# Start Navidrome with custom configuration
cd "$(dirname "$0")"

echo "Starting Navidrome with custom theme..."
echo "Access at: http://localhost:4533"
echo ""

./navidrome --configfile navidrome.toml
