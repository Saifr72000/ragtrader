# PDF Preprocessor with Chunk Overlapping

This PDF preprocessor extracts text and images from PDFs with configurable chunk overlapping to improve RAG system performance.

## Features

- **Page-based chunking**: Each chunk represents a complete page
- **Configurable overlap**: Include content from previous pages to maintain context
- **Multiple overlap strategies**: Characters, sentences, or paragraphs
- **Image extraction**: Convert PDF pages to images and upload to Google Cloud Storage
- **Overlap analysis**: Analyze the effectiveness of chunk overlapping

## API Endpoints

### Process PDF with Overlap

```
POST /process
```

**Query Parameters:**

- `overlap_percentage` (float, 0.0-1.0, default: 0.2): Percentage of previous page content to include
- `overlap_strategy` (string, default: "characters"): Strategy for overlap calculation
  - `"characters"`: Use character count
  - `"sentences"`: Use sentence count
  - `"paragraphs"`: Use paragraph count
- `include_analysis` (boolean, default: false): Include overlap analysis in response

**Example:**

```bash
curl -X POST "http://localhost:8000/process?overlap_percentage=0.3&overlap_strategy=sentences&include_analysis=true" \
  -F "file=@document.pdf"
```

### Analyze Overlap Effectiveness

```
POST /analyze-overlap
```

Analyzes overlap effectiveness without processing images (faster for testing).

## Overlap Strategies

### 1. Characters (Default)

- Uses character count to determine overlap
- Ensures word boundaries are respected
- Good for consistent overlap size

### 2. Sentences

- Uses sentence count for overlap
- Maintains semantic completeness
- Better for natural language processing

### 3. Paragraphs

- Uses paragraph count for overlap
- Preserves document structure
- Good for structured documents

## Response Format

```json
{
  "chunks": [
    {
      "page": 1,
      "text": "[Previous page context:]\n...\n\n[Current page:]\n...",
      "original_text": "...",
      "image_data_url": "https://...",
      "has_overlap": false,
      "overlap_length": 0,
      "overlap_strategy": "characters",
      "overlap_percentage": 0.2
    }
  ],
  "total_pages": 5,
  "overlap_analysis": {
    "total_chunks": 5,
    "chunks_with_overlap": 4,
    "average_overlap_length": 150,
    "overlap_percentage_used": 0.2,
    "strategy_used": "characters",
    "chunk_details": [...]
  }
}
```

## Usage Examples

### Basic Usage (20% character overlap)

```python
import requests

with open('document.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/process',
        files={'file': f}
    )
```

### Custom Overlap (30% sentence overlap)

```python
response = requests.post(
    'http://localhost:8000/process?overlap_percentage=0.3&overlap_strategy=sentences',
    files={'file': f}
)
```

### With Analysis

```python
response = requests.post(
    'http://localhost:8000/process?include_analysis=true',
    files={'file': f}
)
data = response.json()
print(f"Average overlap length: {data['overlap_analysis']['average_overlap_length']}")
```

## Benefits of Chunk Overlapping

1. **Context Preservation**: Maintains context when information spans page boundaries
2. **Improved Retrieval**: Better semantic search results for cross-page content
3. **Reduced Information Loss**: Prevents important context from being lost at chunk boundaries
4. **Flexible Configuration**: Adjust overlap based on document type and use case

## Configuration

Set environment variables in `.env`:

```
GOOGLE_CREDENTIALS_JSON={"type": "service_account", ...}
```

## Installation

```bash
pip install -r requirements.txt
uvicorn app:app --reload
```
