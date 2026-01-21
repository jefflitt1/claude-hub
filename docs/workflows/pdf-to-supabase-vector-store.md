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
│ API Upload  │────►│             │     └─────────┘     └─────┬──────┘
└─────────────┘     └─────────────┘                           │
                                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BATCH PROCESSING LOOP                         │
│  ┌──────────┐     ┌───────────┐     ┌─────────┐     ┌────────────┐ │
│  │  Batch   │────►│  Generate │────►│ Prepare │────►│   Filter   │ │
│  │  Chunks  │     │ Embedding │     │ Insert  │     │   Valid    │ │
│  └────▲─────┘     └───────────┘     └─────────┘     └──────┬─────┘ │
│       │                                                     │       │
│       │           ┌───────────────┐                         │       │
│       └───────────│ Continue Loop │◄────────────────────────┤       │
│                   └───────────────┘                         │       │
│                                         ┌────────────┐      │       │
│                                         │ Log Skipped│◄─────┘ (false)│
│                                         └────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                              │ (done)
                              ▼
                    ┌─────────────────┐
                    │ Insert Supabase │────► Summary
                    └─────────────────┘
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

### 6. Batch Chunks
- **Batch Size:** 20 chunks per batch
- Prevents rate limiting on OpenAI API
- Enables progress tracking for large documents

### 7. Generate Embedding
- **Model:** `text-embedding-3-small` (OpenAI)
- **Credential:** `OpenAI API Header`
- **Error Handling:** Continue on error (skips failed chunks)
- **Timeout:** 30 seconds

### 8. Prepare Insert
Combines chunk metadata with embedding vector:
- Handles embedding errors gracefully
- Marks failed chunks as skipped
- Preserves all metadata for Supabase insert

### 9. Filter Valid
Routes items based on embedding success:
- **True path:** Valid embeddings → Insert to Supabase
- **False path:** Failed/skipped → Log Skipped

### 10. Insert to Supabase
- **Table:** `document_embeddings`
- **Credential:** `Supabase Service Key`
- **Error Handling:** Continue on error

### 11. Continue Loop
Returns to Batch Chunks for next batch until all chunks processed.

### 12. Summary
Returns final status after all batches complete:
```json
{
  "status": "success",
  "file": "document.pdf",
  "project": "l7-partners",
  "source": "form",
  "total_chunks": 15,
  "processed_at": "2026-01-21T00:00:00.000Z"
}
```

### 13. Log Skipped
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

| Credential | ID | Purpose |
|------------|-----|---------|
| OpenAI API Header | `openai-header` | Embedding generation |
| Supabase Service Key | `supabase-header` | Database insert |

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
3. **Batch Processing** - Prevents rate limits, enables large document handling
4. **Error Resilience** - Failed chunks don't stop workflow
5. **Document Hashing** - Enables deduplication detection
6. **Credential References** - No inline API keys
7. **Newer Embedding Model** - `text-embedding-3-small` for better quality/cost ratio

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "No PDF file found" | Binary not in expected property | Check trigger type and binary property name |
| "Invalid file type" | Non-PDF uploaded | Ensure file has .pdf extension |
| "PDF extraction failed" | Corrupted or image-only PDF | Use OCR preprocessing for scanned docs |
| Embedding errors | Rate limit or API key issue | Check OpenAI credentials, reduce batch size |
| Supabase insert fails | Schema mismatch | Verify `document_embeddings` table exists |

## Related Workflows

- **Error Handler:** `OSKEDUq7HqOKiwWw` - Receives error notifications
- **Vector Search:** Use `l7_vector_search` MCP tool to query embeddings
