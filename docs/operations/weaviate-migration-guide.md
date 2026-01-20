# Weaviate to Supabase Migration Guide

## Overview

This guide covers migrating document embeddings from Weaviate (on Raspberry Pi) to Supabase pgvector.

## Current State

### Weaviate Instance
- **URL:** `http://192.168.4.147:8080`
- **Location:** Raspberry Pi (local network only)
- **Classes:**
  - `PROBIS` - Auth: `Bearer PROBIS-key-123`
  - `L7` (or `L7Partners`) - Auth: `Bearer L7P-key-456`

### Supabase Tables
- `documents` - Parent document records
- `document_embeddings` - Vector embeddings with pgvector

## Migration Steps

### Step 1: Import Migration Workflow

1. Open n8n at https://n8n.l7-partners.com
2. Go to **Workflows** → **Import from File**
3. Import: `workflows/weaviate-migration-complete.json`
4. Update the SUPABASE_SERVICE_KEY environment variable if not set

### Step 2: Run Migration

1. Open the imported "Weaviate to Supabase Migration" workflow
2. Click **Execute Workflow**
3. Monitor the execution for any errors
4. Check the Migration Summary node for results

### Step 3: Verify Migration

Run these queries in Supabase SQL Editor:

```sql
-- Count migrated records
SELECT project, COUNT(*) as count
FROM document_embeddings
GROUP BY project

-- Check sample data
SELECT source_name, project, chunk_index,
       LEFT(content, 100) as content_preview
FROM document_embeddings
LIMIT 10

-- Verify embeddings exist
SELECT COUNT(*) as with_embedding
FROM document_embeddings
WHERE embedding IS NOT NULL
```

### Step 4: Deploy New PDF Workflow

1. Import: `workflows/pdf-to-supabase-complete.json`
2. Configure credentials:
   - OpenAI API (for embeddings)
   - Set `SUPABASE_SERVICE_KEY` environment variable
3. Activate the workflow
4. Test with a sample PDF upload

### Step 5: Deactivate Old Workflows

After successful migration, deactivate:
- `PDF to weaviate` (BdmQTuQ9YwkiFp2M)
- `PDF to weaviate - L7` (G0iqjev1R4IsFxrA)
- `L7 Drive Trigger for files to Weaviate` (pK0muoyUOFyrfUUL)

## Troubleshooting

### Weaviate Connection Issues
If migration fails to connect to Weaviate:
1. SSH to Raspberry Pi
2. Check if Weaviate is running: `docker ps | grep weaviate`
3. Test connection: `curl http://localhost:8080/v1/.well-known/ready`

### Missing Embeddings
If Weaviate objects don't have vectors:
1. Objects were stored without `include=vector`
2. Will need to re-generate embeddings via OpenAI
3. Use the PDF to Supabase workflow to re-process source files

### Large Datasets
For >1000 objects per class:
1. Modify the migration workflow to use pagination
2. Add `offset` parameter to Weaviate query
3. Loop until all objects are migrated

## Environment Variables

Ensure these are set in n8n:
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `OPENAI_API_KEY` - For new embeddings (if regenerating)

## Rollback

If issues occur:
1. Truncate Supabase tables:
   ```sql
   TRUNCATE document_embeddings CASCADE
   ```
2. Re-activate Weaviate workflows
3. Debug and retry migration

---

**Created:** 2026-01-20
**Status:** Ready for execution
