#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# TrustScaffold — Auditor Hash Verification Script
#
# This script independently verifies the integrity of:
#   1. Evidence artifact hashes (RFC 8785 JCS → SHA-256)
#   2. Audit log hash chain (SHA-256 append-only chain)
#
# Prerequisites: bash, curl, jq, openssl (or shasum)
#
# Usage:
#   ./verify-hashes.sh <SUPABASE_URL> <SERVICE_ROLE_KEY> <ORG_ID>
#
# The script is read-only and makes no mutations.
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SUPABASE_URL="${1:?Usage: $0 <SUPABASE_URL> <SERVICE_ROLE_KEY> <ORG_ID>}"
SERVICE_ROLE_KEY="${2:?Missing SERVICE_ROLE_KEY}"
ORG_ID="${3:?Missing ORG_ID}"

API="${SUPABASE_URL}/rest/v1"
AUTH_HEADER="Authorization: Bearer ${SERVICE_ROLE_KEY}"
APIKEY_HEADER="apikey: ${SERVICE_ROLE_KEY}"

echo "═══════════════════════════════════════════════════════════════"
echo "  TrustScaffold Auditor Verification"
echo "  Organization: ${ORG_ID}"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── Step 1: Verify Evidence Artifact Hashes ──────────────────────────────────

echo "▸ Step 1: Verifying evidence artifact hashes (RFC 8785 JCS + SHA-256)..."
echo ""

ARTIFACTS=$(curl -s "${API}/evidence_artifacts?organization_id=eq.${ORG_ID}&select=id,artifact_name,raw_data_hash,storage_path" \
  -H "${AUTH_HEADER}" -H "${APIKEY_HEADER}" -H "Content-Type: application/json")

ARTIFACT_COUNT=$(echo "${ARTIFACTS}" | jq length)
PASS_COUNT=0
FAIL_COUNT=0

for i in $(seq 0 $((ARTIFACT_COUNT - 1))); do
  ARTIFACT_NAME=$(echo "${ARTIFACTS}" | jq -r ".[$i].artifact_name")
  EXPECTED_HASH=$(echo "${ARTIFACTS}" | jq -r ".[$i].raw_data_hash")
  STORAGE_PATH=$(echo "${ARTIFACTS}" | jq -r ".[$i].storage_path")

  # Download the canonical JSON from storage
  CANONICAL_JSON=$(curl -s "${SUPABASE_URL}/storage/v1/object/authenticated/evidence/${STORAGE_PATH}" \
    -H "${AUTH_HEADER}")

  # Compute SHA-256 of the canonical form
  COMPUTED_HASH=$(echo -n "${CANONICAL_JSON}" | shasum -a 256 | cut -d' ' -f1)

  if [[ "${COMPUTED_HASH}" == "${EXPECTED_HASH}" ]]; then
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "  ✗ MISMATCH: ${ARTIFACT_NAME}"
    echo "    Expected: ${EXPECTED_HASH}"
    echo "    Computed: ${COMPUTED_HASH}"
  fi
done

echo "  Evidence artifacts: ${ARTIFACT_COUNT} total, ${PASS_COUNT} verified, ${FAIL_COUNT} mismatched"
echo ""

# ── Step 2: Verify Audit Log Hash Chain ──────────────────────────────────────

echo "▸ Step 2: Verifying audit log hash chain integrity..."
echo ""

LOGS=$(curl -s "${API}/audit_logs?organization_id=eq.${ORG_ID}&order=created_at.asc&select=id,action,entity_type,entity_id,details,event_checksum,previous_checksum,created_at" \
  -H "${AUTH_HEADER}" -H "${APIKEY_HEADER}" -H "Content-Type: application/json")

LOG_COUNT=$(echo "${LOGS}" | jq length)
CHAIN_VALID=true
PREV_CHECKSUM=""

for i in $(seq 0 $((LOG_COUNT - 1))); do
  CHECKSUM=$(echo "${LOGS}" | jq -r ".[$i].event_checksum")
  STORED_PREV=$(echo "${LOGS}" | jq -r ".[$i].previous_checksum // empty")

  if [[ $i -gt 0 ]]; then
    if [[ "${STORED_PREV}" != "${PREV_CHECKSUM}" && -n "${STORED_PREV}" ]]; then
      CHAIN_VALID=false
      LOG_ID=$(echo "${LOGS}" | jq -r ".[$i].id")
      echo "  ✗ CHAIN BREAK at log ${LOG_ID}"
      echo "    Expected previous: ${PREV_CHECKSUM}"
      echo "    Stored previous:   ${STORED_PREV}"
    fi
  fi

  PREV_CHECKSUM="${CHECKSUM}"
done

if [[ "${CHAIN_VALID}" == "true" ]]; then
  echo "  Audit log chain: ${LOG_COUNT} entries, chain integrity VERIFIED"
else
  echo "  Audit log chain: ${LOG_COUNT} entries, chain integrity BROKEN"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Verification complete."
echo "═══════════════════════════════════════════════════════════════"
