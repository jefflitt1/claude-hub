#!/bin/bash
# Weaviate to Supabase Migration Script
# Run this directly on the Raspberry Pi where Weaviate is accessible

set -e

# Configuration
WEAVIATE_URL="http://192.168.4.147:8080"
SUPABASE_URL="https://donnmhbwhpjlmpnwgdqr.supabase.co"
SUPABASE_KEY="${SUPABASE_SERVICE_KEY:-}"

# Check for required env var
if [ -z "$SUPABASE_KEY" ]; then
    echo "ERROR: SUPABASE_SERVICE_KEY environment variable is required"
    echo "Usage: SUPABASE_SERVICE_KEY=your_key ./weaviate-to-supabase-migrate.sh"
    exit 1
fi

# Classes to migrate
declare -A CLASSES=(
    ["PROBIS"]="PROBIS-key-123:probis"
    ["L7"]="L7P-key-456:l7-partners"
)

TOTAL_MIGRATED=0
TOTAL_FAILED=0

echo "=========================================="
echo "Weaviate to Supabase Migration"
echo "=========================================="
echo "Weaviate: $WEAVIATE_URL"
echo "Supabase: $SUPABASE_URL"
echo ""

for CLASS in "${!CLASSES[@]}"; do
    IFS=':' read -r AUTH_KEY PROJECT <<< "${CLASSES[$CLASS]}"

    echo "----------------------------------------"
    echo "Migrating class: $CLASS -> project: $PROJECT"
    echo "----------------------------------------"

    # Fetch objects from Weaviate
    echo "Fetching objects from Weaviate..."
    RESPONSE=$(curl -s -X GET \
        "$WEAVIATE_URL/v1/objects?class=$CLASS&limit=1000&include=vector" \
        -H "Authorization: Bearer $AUTH_KEY" \
        -H "Content-Type: application/json")

    # Check if we got a valid response
    if ! echo "$RESPONSE" | jq -e '.objects' > /dev/null 2>&1; then
        echo "ERROR: Failed to fetch from Weaviate class $CLASS"
        echo "Response: $RESPONSE"
        continue
    fi

    OBJECT_COUNT=$(echo "$RESPONSE" | jq '.objects | length')
    echo "Found $OBJECT_COUNT objects"

    if [ "$OBJECT_COUNT" -eq 0 ]; then
        echo "No objects to migrate for $CLASS"
        continue
    fi

    # Process each object
    echo "$RESPONSE" | jq -c '.objects[]' | while read -r OBJ; do
        # Extract fields
        CONTENT=$(echo "$OBJ" | jq -r '.properties.content // .properties.text // ""')
        VECTOR=$(echo "$OBJ" | jq -c '.vector // null')
        SOURCE_FILE=$(echo "$OBJ" | jq -r '.properties.source_file // .properties.filename // "unknown"')
        DOC_TYPE=$(echo "$OBJ" | jq -r '.properties.document_type // "pdf"')
        CHUNK_INDEX=$(echo "$OBJ" | jq -r '.properties.chunk_index // 0')
        WEAVIATE_ID=$(echo "$OBJ" | jq -r '.id')
        PDF_TITLE=$(echo "$OBJ" | jq -r '.properties.pdf_title // .properties.title // null')
        PDF_AUTHOR=$(echo "$OBJ" | jq -r '.properties.pdf_author // null')
        PDF_PAGES=$(echo "$OBJ" | jq -r '.properties.pdf_pages // null')
        CATEGORY=$(echo "$OBJ" | jq -r '.properties.category // null')

        # Skip if no content
        if [ -z "$CONTENT" ] || [ ${#CONTENT} -lt 10 ]; then
            continue
        fi

        # Build metadata JSON
        METADATA=$(jq -n \
            --arg title "$PDF_TITLE" \
            --arg author "$PDF_AUTHOR" \
            --arg pages "$PDF_PAGES" \
            --arg category "$CATEGORY" \
            --arg wclass "$CLASS" \
            --arg wid "$WEAVIATE_ID" \
            '{
                pdf_title: (if $title == "null" then null else $title end),
                pdf_author: (if $author == "null" then null else $author end),
                pdf_pages: (if $pages == "null" then null else ($pages | tonumber?) end),
                category: (if $category == "null" then null else $category end),
                weaviate_class: $wclass,
                weaviate_id: $wid,
                migrated_at: (now | todate)
            }')

        # Build the insert payload
        PAYLOAD=$(jq -n \
            --arg content "$CONTENT" \
            --argjson embedding "$VECTOR" \
            --arg source_name "$SOURCE_FILE" \
            --arg source_type "$DOC_TYPE" \
            --arg project "$PROJECT" \
            --argjson chunk_index "$CHUNK_INDEX" \
            --argjson metadata "$METADATA" \
            '{
                content: $content,
                embedding: $embedding,
                source_name: $source_name,
                source_type: $source_type,
                project: $project,
                chunk_index: $chunk_index,
                doc_metadata: $metadata
            }')

        # Insert into Supabase
        INSERT_RESULT=$(curl -s -X POST \
            "$SUPABASE_URL/rest/v1/document_embeddings" \
            -H "apikey: $SUPABASE_KEY" \
            -H "Authorization: Bearer $SUPABASE_KEY" \
            -H "Content-Type: application/json" \
            -H "Prefer: return=representation" \
            -d "$PAYLOAD")

        # Check result
        if echo "$INSERT_RESULT" | jq -e '.[0].id' > /dev/null 2>&1; then
            echo -n "."
            ((TOTAL_MIGRATED++)) || true
        else
            echo -n "x"
            ((TOTAL_FAILED++)) || true
        fi
    done

    echo ""
    echo "Completed $CLASS"
done

echo ""
echo "=========================================="
echo "Migration Complete"
echo "=========================================="
echo "Total migrated: $TOTAL_MIGRATED"
echo "Total failed: $TOTAL_FAILED"

# Verify counts
echo ""
echo "Verifying in Supabase..."
curl -s -X GET \
    "$SUPABASE_URL/rest/v1/document_embeddings?select=project,count" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Prefer: count=exact" | jq '.'
