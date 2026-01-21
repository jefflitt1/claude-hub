# PDF to Supabase (Vector Store) - Complete

**Workflow ID:** `SQGYg7V8RO0oiAET`
**Status:** Active
**Last Updated:** 2026-01-21

## Purpose

Ingests PDF documents into the Supabase `document_embeddings` vector store for semantic search and RAG (Retrieval Augmented Generation) applications. Supports both web form uploads and API-based ingestion.

## Endpoints

| Trigger | URL | Method |
|---------|-----|--------|
| **Form Upload** | `https://n8n.l7-partners.com/form/pdf-to-supabase-form` | GET (form) |
| **API Upload** | `https://n8n.l7-partners.com/webhook/pdf-upload-api` | POST |

## Flow Architecture

```
┌─────────────┐     ┌─────────────┐
│ Form Upload │────►│             │
└─────────────┘     │  Normalize  │     ┌─────────┐     ┌────────────┐
                    │    Input    │────►│ Extract │────►│   Chunk    │
┌─────────────┐     │             │     │   PDF   │     │    Text    │
│ API Upload  │────►│             │     └─────────┘     └────────────┘
└─────────────┘     └─────────────┘                           │
                                                              ▼
                    ┌───────────┐     ┌─────────┐     ┌────────────┐
                    │  Generate │────►│ Prepare │────►│   Filter   │
                    │ Embedding │     │ Insert  │     │   Valid    │
                    └───────────┘     └─────────┘     └──────┬─────┘
                                                             │
                              ┌───────────────────────────────┤
                              │                               │
                              ▼                               ▼
                    ┌─────────────────┐              ┌────────────┐
                    │ Insert Supabase │              │ Log Skipped│
                    └────────┬────────┘              └──────┬─────┘
                             │                              │
                             └──────────┬───────────────────┘
                                        ▼
                                   ┌─────────┐
                                   │ Summary │
                                   └─────────┘
```

## Node Details

### 1. Form Upload (Trigger)
- **Type:** Form Trigger
- **Fields:**
  - `file` (required): PDF file upload (.pdf only)
  - `project` (required): Dropdown - l7-partners, probis, jgl-capital, claude-hub

### 2. API Upload (Trigger)
- **Type:** Webhook (POST)
- **Path:** `/webhook/pdf-upload-api`
- **Expected Input:** Binary PDF data with optional `project` in JSON body or query params

### 3. Normalize Input
Unifies input from both triggers into consistent format:
- Detects binary property location (`file`, `data`, or first available)
- Extracts project name and filename
- Validates file is PDF by extension or MIME type
- Standardizes binary to `data` property

### 4. Extract PDF
- **Type:** Extract From File
- **Operation:** PDF text extraction
- **Binary Property:** `data`

### 5. Chunk Text
Intelligent semantic chunking with:
- **Chunk Size:** 1000 characters
- **Overlap:** 150 characters (for context continuity)
- **Min Chunk Size:** 100 characters
- Paragraph-aware splitting
- Document hash generation (MD5, first 8 chars)
- Metadata attached to each chunk

### 6. Generate Embedding
- **Type:** HTTP Request
- **Model:** `text-embedding-3-small` (OpenAI)
- **Credential Type:** `openAiApi` (native n8n credential)
- **Error Handling:** Continue on error (skips failed chunks)
- **Timeout:** 30 seconds

### 7. Prepare Insert
Combines chunk metadata with embedding vector:
- Handles embedding errors gracefully
- Marks failed chunks as skipped
- Preserves all metadata for Supabase insert

### 8. Filter Valid
Routes items based on embedding success:
- **True path:** Valid embeddings → Insert to Supabase
- **False path:** Failed/skipped → Log Skipped

### 9. Insert to Supabase
- **Type:** HTTP Request
- **Table:** `document_embeddings`
- **Credential Type:** `supabaseApi` (native n8n credential)
- **Error Handling:** Continue on error

### 10. Summary
Returns final status:
```json
{
  "status": "success",
  "file": "document.pdf",
  "project": "l7-partners",
  "source": "form",
  "total_chunks": 15,
  "inserted_count": 15,
  "processed_at": "2026-01-21T00:00:00.000Z"
}
```

### 11. Log Skipped
Records chunks that failed embedding generation for debugging.

## Database Schema

**Table:** `document_embeddings`

| Column | Type | Description |
|--------|------|-------------|
| `content` | TEXT | Chunk text content |
| `embedding` | VECTOR(1536) | OpenAI embedding vector |
| `source_name` | TEXT | Original filename |
| `source_type` | TEXT | Always "pdf" for this workflow |
| `source_path` | TEXT | NULL (local uploads) |
| `project` | TEXT | Project identifier |
| `chunk_index` | INT | Position within document |
| `doc_metadata` | JSONB | Additional metadata |

**Metadata Structure:**
```json
{
  "original_filename": "document.pdf",
  "file_size": 1234567,
  "upload_source": "form",
  "processed_at": "2026-01-21T00:00:00.000Z",
  "chunk_size": 987,
  "total_doc_length": 15000
}
```

## Required Credentials

| Credential Type | n8n Type | Purpose |
|-----------------|----------|---------|
| **OpenAI API** | `openAiApi` | Embedding generation (handles Bearer auth automatically) |
| **Supabase API** | `supabaseApi` | Database insert (handles both `apikey` and `Authorization` headers) |

**Setup in n8n:**
1. **OpenAI API** - Create credential with your API key (`sk-proj-...`)
2. **Supabase API** - Create credential with:
   - Host: `https://donnmhbwhpjlmpnwgdqr.supabase.co`
   - Service Role Key: Full JWT token (`eyJ...`)

## Error Handling

- **Error Workflow:** `OSKEDUq7HqOKiwWw` (centralized error logging)
- **Per-Node Errors:** `onError: continueErrorOutput` on embedding and insert nodes
- **Invalid Chunks:** Routed to Log Skipped, workflow continues

## Usage Examples

### Form Upload
Navigate to: `https://n8n.l7-partners.com/form/pdf-to-supabase-form`
1. Select a PDF file
2. Choose the target project
3. Submit

### API Upload (curl)
```bash
curl -X POST \
  https://n8n.l7-partners.com/webhook/pdf-upload-api \
  -H "Content-Type: multipart/form-data" \
  -F "file=@document.pdf" \
  -F "project=l7-partners"
```

### API Upload (with binary)
```bash
curl -X POST \
  https://n8n.l7-partners.com/webhook/pdf-upload-api?project=l7-partners \
  -H "Content-Type: application/pdf" \
  --data-binary @document.pdf
```

## Best Practices Applied

1. **Input Normalization** - Single code node handles all trigger variations
2. **Semantic Chunking** - Paragraph-aware with overlap for context preservation
3. **Error Resilience** - Failed chunks don't stop workflow
4. **Document Hashing** - Enables deduplication detection
5. **Native Credentials** - Uses `openAiApi` and `supabaseApi` types (auto-handles auth headers)
6. **Newer Embedding Model** - `text-embedding-3-small` for better quality/cost ratio

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "No PDF file found" | Binary not in expected property | Check trigger type and binary property name |
| "Invalid file type" | Non-PDF uploaded | Ensure file has .pdf extension |
| "PDF extraction failed" | Corrupted or image-only PDF | Use OCR preprocessing for scanned docs |
| OpenAI 401 error | Invalid API key | Verify OpenAI API credential has valid key |
| Supabase 401 error | Missing headers | Use native `supabaseApi` credential type (not HTTP Header Auth) |
| Supabase insert fails | Schema mismatch | Verify `document_embeddings` table exists with correct columns |

## Related Workflows

- **Error Handler:** `OSKEDUq7HqOKiwWw` - Receives error notifications
- **Vector Search:** Use `l7_vector_search` MCP tool to query embeddings
