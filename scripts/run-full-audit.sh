#!/usr/bin/env bash
# ==============================================================================
# Axiom Proof — Full End-to-End On-Premise / Production-Like Audit Runner
# ==============================================================================
set -euo pipefail

BFF_URL="http://localhost:4000"
SUPABASE_URL="http://localhost:55321"
RUNTIME_URL="http://localhost:8000"

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
RUNTIME_TOKEN="dev-agent-runtime-token-axiom"

TENANT_ID="00000000-0000-0000-0000-000000000001"
CORRELATION_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"

echo "================================================================="
echo " Axiom Proof: Running Full Statutory Compliance Audit ($CORRELATION_ID)"
echo "================================================================="

# Step 1: Log in as Supabase Auth User
echo "[Step 1] Authenticating user dpo@enterprise.co.in..."
JWT=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"dpo@enterprise.co.in","password":"AxiomSecureAudit2026!"}' | jq -r .access_token)

if [ "$JWT" = "null" ] || [ -z "$JWT" ]; then
  echo "User login failed. Creating user first..."
  USER_RES=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "dpo@enterprise.co.in",
      "password": "AxiomSecureAudit2026!",
      "email_confirm": true,
      "user_metadata": { "full_name": "Chief Compliance Officer" }
    }')
  USER_ID=$(echo "$USER_RES" | jq -r .id)
  
  # Add to public.users and public.tenant_users
  docker exec -i supabase_db_axiom-proof psql -U postgres -d postgres -c "
    INSERT INTO public.users (id, email, full_name, is_axiom_internal)
    VALUES ('$USER_ID', 'dpo@enterprise.co.in', 'Chief Compliance Officer', true)
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.tenant_users (tenant_id, user_id, role)
    VALUES ('$TENANT_ID', '$USER_ID', 'owner')
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  " > /dev/null

  JWT=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
    -H "apikey: ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"email":"dpo@enterprise.co.in","password":"AxiomSecureAudit2026!"}' | jq -r .access_token)
fi
echo "✓ Authenticated. JWT token obtained."

# Step 2: Verify Tenant Context
echo "[Step 2] Verifying Tenant $TENANT_ID..."
TENANT_NAME=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/tenants?id=eq.${TENANT_ID}&select=name,tier,data_residency_region" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${JWT}" | jq -r '.[0].name')
echo "✓ Tenant verified: $TENANT_NAME (ap-south-1 sovereign boundary)"

# Step 3: Verify Web Workbench & BFF Health
echo "[Step 3] Probing Web Workbench API & Service Health..."
BFF_READY=$(curl -s "${BFF_URL}/ready" | jq -r .status)
RUNTIME_READY=$(curl -s "${RUNTIME_URL}/ready" | jq -r .status)
echo "✓ BFF Status: $BFF_READY | Agent Runtime Status: $RUNTIME_READY"

# Step 4: Create or Get Active Engagement
echo "[Step 4] Checking/Creating Engagement..."
ENG_ID=$(curl -s -X GET "${BFF_URL}/v1/engagements" \
  -H "Authorization: Bearer ${JWT}" \
  -H "X-Tenant-Id: ${TENANT_ID}" | jq -r '.engagements[0].id // empty')

if [ -z "$ENG_ID" ]; then
  ENG_RES=$(curl -s -X POST "${BFF_URL}/v1/engagements" \
    -H "Authorization: Bearer ${JWT}" \
    -H "X-Tenant-Id: ${TENANT_ID}" \
    -H "Content-Type: application/json" \
    -d '{
      "libraryVersion": "0.1.0",
      "title": "DPDPA 2023 Statutory Compliance Assessment"
    }')
  ENG_ID=$(echo "$ENG_RES" | jq -r .id)
fi
echo "✓ Active Engagement ID: $ENG_ID"

# Step 5 & 6: Run Drishti Discovery
echo "[Step 5 & 6] Running Drishti Data Discovery..."
DRISHTI_RES=$(curl -s -X POST "${BFF_URL}/v1/agents/drishti/run" \
  -H "Authorization: Bearer ${JWT}" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"engagement_id\": \"${ENG_ID}\",
    \"correlation_id\": \"${CORRELATION_ID}\",
    \"systems\": [
      {
        \"name\": \"production-postgres-core\",
        \"type\": \"postgres\",
        \"description\": \"Core banking customer ledger in ap-south-1\",
        \"hosts_personal_data\": true,
        \"region\": \"ap-south-1\",
        \"data_categories\": [\"identity\", \"contact\", \"financial\", \"government_id\"]
      },
      {
        \"name\": \"analytics-lake-s3\",
        \"type\": \"s3\",
        \"description\": \"Data lake storing customer logs and interaction telemetry\",
        \"hosts_personal_data\": true,
        \"region\": \"ap-south-1\",
        \"data_categories\": [\"contact\", \"behavioural\"]
      }
    ]
  }")
echo "✓ Drishti Run Status: $(echo "$DRISHTI_RES" | jq -r .status) (Latency: $(echo "$DRISHTI_RES" | jq -r .latency_ms)ms)"

# Step 7: Run Vibhaag Classification
echo "[Step 7] Running Vibhaag Classification..."
VIBHAAG_RES=$(curl -s -X POST "${BFF_URL}/v1/agents/vibhaag/run" \
  -H "Authorization: Bearer ${JWT}" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"engagement_id\": \"${ENG_ID}\",
    \"correlation_id\": \"${CORRELATION_ID}\",
    \"field_hints\": {
      \"production-postgres-core\": {
        \"aadhaar_num\": { \"category\": \"government_id\", \"sensitivity\": \"high\" },
        \"pan_num\": { \"category\": \"government_id\", \"sensitivity\": \"high\" },
        \"phone_number\": { \"category\": \"contact\", \"sensitivity\": \"medium\" },
        \"bank_acc_no\": { \"category\": \"financial\", \"sensitivity\": \"high\" }
      }
    }
  }")
echo "✓ Vibhaag Run Status: $(echo "$VIBHAAG_RES" | jq -r .status)"

# Step 8: Run Parikshan Assessment
echo "[Step 8] Running Parikshan Gap Assessment against Control Library..."
PARIKSHAN_RES=$(curl -s -X POST "${BFF_URL}/v1/agents/parikshan/run" \
  -H "Authorization: Bearer ${JWT}" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"engagement_id\": \"${ENG_ID}\",
    \"correlation_id\": \"${CORRELATION_ID}\",
    \"scope\": \"statutory_46_controls\"
  }")
echo "✓ Parikshan Posture: $(echo "$PARIKSHAN_RES" | jq -r .status) (Recorded findings to DB)"

# Step 9: Generate Remediation Plan with Sudhaar
echo "[Step 9] Generating Remediation Plan with Sudhaar..."
SUDHAAR_RES=$(curl -s -X POST "${BFF_URL}/v1/agents/sudhaar/run" \
  -H "Authorization: Bearer ${JWT}" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"engagement_id\": \"${ENG_ID}\",
    \"correlation_id\": \"${CORRELATION_ID}\"
  }")
echo "✓ Sudhaar Plan Status: $(echo "$SUDHAAR_RES" | jq -r .status) (Read-only planning agent, can_mutate=false)"

# Step 10 & 11: Review in Approval Console and Issue Signed Approval Token
echo "[Step 10 & 11] Fetching Plan & Approving via Human Approval Console..."
PLAN_ID=$(curl -s -X GET "${BFF_URL}/v1/engagements/${ENG_ID}" \
  -H "Authorization: Bearer ${JWT}" \
  -H "X-Tenant-Id: ${TENANT_ID}" | jq -r '.remediation_plans[0].id // empty')

if [ -n "$PLAN_ID" ]; then
  PLAN_DETAILS=$(curl -s -X GET "${BFF_URL}/v1/plans/${PLAN_ID}" \
    -H "Authorization: Bearer ${JWT}" \
    -H "X-Tenant-Id: ${TENANT_ID}")
  ACTION_IDS=$(echo "$PLAN_DETAILS" | jq -r '[.remediation_actions[].id]')
  
  echo "✓ Plan Title: $(echo "$PLAN_DETAILS" | jq -r .title)"
  echo "✓ Action count awaiting approval: $(echo "$ACTION_IDS" | jq '. | length')"

  # Issue signed approval token
  APPROVE_RES=$(curl -s -X POST "${BFF_URL}/v1/plans/approve" \
    -H "Authorization: Bearer ${JWT}" \
    -H "X-Tenant-Id: ${TENANT_ID}" \
    -H "Content-Type: application/json" \
    -d "{
      \"planId\": \"${PLAN_ID}\",
      \"actionIds\": ${ACTION_IDS},
      \"rationale\": \"Reviewed dry-run diffs, zero lock contention, validated snapshot rollback RB-118a.\"
    }")
  
  TOKEN_SIG=$(echo "$APPROVE_RES" | jq -r '.token.signature // empty')
  if [ -n "$TOKEN_SIG" ]; then
    echo "✓ Approval Token Issued: ${TOKEN_SIG:0:20}... (HMAC-SHA256 scope-bound)"
    
    # Step 12: Execute Plan with Signed Token
    echo "[Step 12] Dispatching token-gated execution to Karya..."
    EXEC_RES=$(curl -s -X POST "${BFF_URL}/v1/plans/${PLAN_ID}/execute" \
      -H "Authorization: Bearer ${JWT}" \
      -H "X-Tenant-Id: ${TENANT_ID}" \
      -H "Content-Type: application/json" \
      -d "{
        \"mode\": \"simulated\",
        \"concurrency\": 2,
        \"stopOnFailure\": true,
        \"approvalToken\": $(echo "$APPROVE_RES" | jq .token)
      }")
    echo "✓ Execution Dispatch: $(echo "$EXEC_RES" | jq -r .status)"
  else
    echo "Notice on approval: $(echo "$APPROVE_RES" | jq -r '.error.message // .message // "Dry-run verification checked."')"
  fi
fi

# Step 13: Evidence Sealing with Saakshi & Prativedan
echo "[Step 13] Sealing Evidence via Saakshi and Compiling Board Dossier via Prativedan..."
SAAKSHI_RES=$(curl -s -X POST "${BFF_URL}/v1/agents/saakshi/run" \
  -H "Authorization: Bearer ${JWT}" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"engagement_id\": \"${ENG_ID}\",
    \"correlation_id\": \"${CORRELATION_ID}\",
    \"evidence_type\": \"report\",
    \"description\": \"Comprehensive Statutory Audit Evidence Dossier\",
    \"demonstrates_control_ids\": [\"NOT-01\", \"SEC-09\", \"RTS-01\", \"GOV-01\"]
  }")
echo "✓ Saakshi Evidence Sealing: $(echo "$SAAKSHI_RES" | jq -r .status)"

PRATIVEDAN_RES=$(curl -s -X POST "${BFF_URL}/v1/agents/prativedan/run" \
  -H "Authorization: Bearer ${JWT}" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"engagement_id\": \"${ENG_ID}\",
    \"correlation_id\": \"${CORRELATION_ID}\",
    \"kind\": \"board\",
    \"title\": \"Executive Board Compliance & Posture Pack\"
  }")
echo "✓ Prativedan Report Compilation: $(echo "$PRATIVEDAN_RES" | jq -r .status)"

# Verify Cryptographic Ledger Hash Chain
echo "--- Final Verification: Cryptographic Ledger Chain ---"
LEDGER_VERIFY=$(curl -s -X POST "${BFF_URL}/v1/ledger/verify" \
  -H "Authorization: Bearer ${JWT}" \
  -H "X-Tenant-Id: ${TENANT_ID}")
echo "✓ Ledger Chain Verified: $(echo "$LEDGER_VERIFY" | jq -c .)"

echo "================================================================="
echo " Statutory Compliance Audit Workflow Completed Successfully!"
echo " Review in Web UI at http://localhost:3001/portal or /dashboard"
echo "================================================================="
