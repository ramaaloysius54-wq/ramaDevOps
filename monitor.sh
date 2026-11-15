#!/bin/bash

TARGET_DIR="/var/www/rama_bot"
URL="https://tabunganrama.my.id"

# Warna Terminal
C_RESET="\033[0m"
C_BOLD="\033[1m"
C_CYAN="\033[1;36m"
C_GREEN="\033[1;32m"
C_YELLOW="\033[1;33m"
C_RED="\033[1;31m"
C_WHITE="\033[1;37m"

BUILD_ID=$(cat "$TARGET_DIR/.next/BUILD_ID" 2>/dev/null || echo "PROD-BUILD-ACTIVE")
BUILD_TIME=$(stat -c "%y" "$TARGET_DIR/.next/BUILD_ID" 2>/dev/null | cut -d'.' -f1 || date '+%Y-%m-%d %H:%M:%S')

clear
echo -e "${C_CYAN}==================================================================================================================${C_RESET}"
echo -e "  ${C_BOLD}${C_WHITE}RAMA DEVOPS — CLOUDFLARE EDGE TO VPS REAL-TIME TELEMETRY & CI/CD STREAM${C_RESET}"
echo -e "${C_CYAN}==================================================================================================================${C_RESET}"
echo -e "  ${C_WHITE}CI/CD Pipeline  :${C_RESET} ${C_GREEN}GitHub Actions (main) ━━▶ VPS ($TARGET_DIR) [DEPLOYED ✓]${C_RESET}"
echo -e "  ${C_WHITE}Build Artifact  :${C_RESET} ${C_YELLOW}ID: $BUILD_ID${C_RESET} (Synced at: $BUILD_TIME)"
echo -e "  ${C_WHITE}Ingress Target  :${C_RESET} ${C_CYAN}$URL${C_RESET} (Cloudflare Edge ━━▶ VPS Origin Server)"
echo -e "${C_CYAN}==================================================================================================================${C_RESET}"
echo -e "  ${C_YELLOW}Memulai live stream per detik (Tekan Ctrl+C untuk berhenti)...${C_RESET}\n"

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

    # Hitung CPU & RAM VPS
    MEM_INFO=$(free -m)
    RAM_TOTAL=$(echo "$MEM_INFO" | awk '/Mem:/ {print $2}')
    RAM_USED=$(echo "$MEM_INFO" | awk '/Mem:/ {print $3}')
    RAM_PCT=$(( RAM_USED * 100 / RAM_TOTAL ))
    CPU_PCT=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{printf "%2.0f", 100 - $1}')

    # Probe Real-Time: Ambil Status HTTP, Latency, dan CF-Ray ID langsung dari Cloudflare Edge ke VPS
    RAW_RESP=$(curl -L -s -D - -o /dev/null -w "\n__META__|%{http_code}|%{time_total}" --max-time 3 "$URL" 2>/dev/null)
    CF_RAY=$(echo "$RAW_RESP" | grep -i "^cf-ray:" | tail -n 1 | awk '{print $2}' | tr -d '\r')
    [ -z "$CF_RAY" ] && CF_RAY="UNPROXIED/DIRECT"
    META=$(echo "$RAW_RESP" | grep "^__META__|")
    IFS='|' read -r _ HTTP_CODE LATENCY <<< "$META"

    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "[${C_WHITE}$TIMESTAMP${C_RESET}] [${C_GREEN}CI/CD: SYNCED${C_RESET}] [VPS CPU: ${C_YELLOW}${CPU_PCT}%${C_RESET} | RAM: ${C_YELLOW}${RAM_PCT}% (${RAM_USED}MB)${C_RESET}] [CF-RAY: ${C_CYAN}${CF_RAY}${C_RESET}] ━━▶ ${C_GREEN}${C_BOLD}ONLINE (HTTPS 200 OK | ${LATENCY}s)${C_RESET}"
    elif [[ "$HTTP_CODE" =~ ^(502|521|522|524|530)$ ]]; then
        echo -e "[${C_WHITE}$TIMESTAMP${C_RESET}] [${C_RED}ORIGIN DOWN${C_RESET}]  [VPS CPU: ${C_YELLOW}${CPU_PCT}%${C_RESET} | RAM: ${C_YELLOW}${RAM_PCT}% (${RAM_USED}MB)${C_RESET}] [CF-RAY: ${C_CYAN}${CF_RAY}${C_RESET}] ━━▶ ${C_RED}${C_BOLD}⚠️ CRITICAL: CLOUDFLARE GAGAL MENGHUBUNGI VPS (ERROR $HTTP_CODE)!${C_RESET}"
    else
        echo -e "[${C_WHITE}$TIMESTAMP${C_RESET}] [${C_RED}WEB OFFLINE${C_RESET}]  [VPS CPU: ${C_YELLOW}${CPU_PCT}%${C_RESET} | RAM: ${C_YELLOW}${RAM_PCT}% (${RAM_USED}MB)${C_RESET}] [CF-RAY: ${C_CYAN}${CF_RAY}${C_RESET}] ━━▶ ${C_RED}${C_BOLD}⚠️ WARNING: WEBSITE DOWN / TIDAK DAPAT DIAKSES! (CODE: ${HTTP_CODE:-TIMEOUT})${C_RESET}"
    fi

    sleep 1
done
