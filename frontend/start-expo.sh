#!/bin/bash
# Auto-setup ngrok authtoken before expo starts
# This ensures the tunnel reconnects after pod restarts

NGROK_TOKEN="${NGROK_AUTHTOKEN:-3C4wim8hp0PNx0ewj0F2r48x3wP_5HRgepaDmLd4hAEwb3Shw}"

mkdir -p /root/.ngrok2/ /root/.expo/
echo "authtoken: ${NGROK_TOKEN}" > /root/.ngrok2/ngrok.yml
echo "authtoken: ${NGROK_TOKEN}" > /root/.expo/ngrok.yml

# Start expo
exec yarn expo start --tunnel --port 3000
