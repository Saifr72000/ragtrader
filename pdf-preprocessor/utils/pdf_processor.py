import fitz  # PyMuPDF
import base64
import re
import json
import os
from datetime import datetime
from pdf2image import convert_from_bytes
from io import BytesIO
from utils.gcs_uploader import upload_image_to_gcs

def save_processed_data_to_json(chunks, original_filename, output_dir="processed_pdfs"):
    """
    Save processed PDF data to a local JSON file.
    
    Args:
        chunks: List of processed chunks
        original_filename: Original PDF filename
        output_dir: Directory to save JSON files
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_filename = os.path.splitext(original_filename)[0]  # Remove .pdf extension
    json_filename = f"{base_filename}_{timestamp}.json"
    json_path = os.path.join(output_dir, json_filename)
    
    # Prepare data for JSON
    processed_data = {
        "metadata": {
            "original_filename": original_filename,
            "processed_at": datetime.now().isoformat(),
            "total_pages": len(chunks),
            "chunks_with_overlap": sum(1 for chunk in chunks if chunk.get("has_overlap", False)),
            "overlap_percentage": chunks[0].get("overlap_percentage", 0) if chunks else 0,
            "overlap_strategy": chunks[0].get("overlap_strategy", "unknown") if chunks else "unknown"
        },
        "chunks": chunks
    }
    
    # Save to JSON file
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(processed_data, f, indent=2, ensure_ascii=False)
    
    print(f"Processed data saved to: {json_path}")
    return json_path

def analyze_overlap_effectiveness(chunks):
    """
    Analyze the effectiveness of chunk overlapping.
    
    Args:
        chunks: List of processed chunks from extract_pdf_data
        
    Returns:
        dict: Analysis results
    """
    if not chunks:
        return {"error": "No chunks provided"}
    
    analysis = {
        "total_chunks": len(chunks),
        "chunks_with_overlap": sum(1 for chunk in chunks if chunk.get("has_overlap", False)),
        "average_overlap_length": 0,
        "overlap_percentage_used": chunks[0].get("overlap_percentage", 0) if chunks else 0,
        "strategy_used": chunks[0].get("overlap_strategy", "unknown") if chunks else "unknown",
        "chunk_details": []
    }
    
    total_overlap_length = 0
    for chunk in chunks:
        overlap_length = chunk.get("overlap_length", 0)
        total_overlap_length += overlap_length
        
        chunk_detail = {
            "page": chunk.get("page"),
            "original_length": len(chunk.get("original_text", "")),
            "combined_length": len(chunk.get("text", "")),
            "overlap_length": overlap_length,
            "has_overlap": chunk.get("has_overlap", False)
        }
        analysis["chunk_details"].append(chunk_detail)
    
    if analysis["chunks_with_overlap"] > 0:
        analysis["average_overlap_length"] = total_overlap_length / analysis["chunks_with_overlap"]
    
    return analysis

def extract_pdf_data(pdf_bytes, overlap_percentage=0.2, overlap_strategy="characters", save_to_json=True, original_filename="document.pdf"):
    """
    Extract PDF data with overlapping chunks.
    
    Args:
        pdf_bytes: PDF file bytes
        overlap_percentage: Percentage of previous page content to include (0.0 to 1.0)
                          Default is 0.2 (20% overlap)
        overlap_strategy: Strategy for overlap calculation
                         - "characters": Use character count (default)
                         - "sentences": Use sentence count
                         - "paragraphs": Use paragraph count
        save_to_json: Whether to save processed data to local JSON file
        original_filename: Original PDF filename for JSON file naming
    """
    print(f"Extracting PDF data with {overlap_percentage*100}% overlap using {overlap_strategy} strategy...")
    result = []

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    print(f"Processing {doc.page_count} pages...")
    # Process all pages in the PDF
    images = convert_from_bytes(pdf_bytes, dpi=300)

    # Use all pages in the document
    num_pages = doc.page_count
    
    # Store page texts for overlap calculation
    page_texts = []
    
    # First pass: extract all page texts
    for i in range(num_pages):
        page = doc.load_page(i)
        text = page.get_text("text").strip()
        page_texts.append(text)
    
    def get_overlap_text(text, percentage, strategy):
        """Extract overlap text based on the specified strategy."""
        if not text or percentage <= 0:
            return ""
        
        if strategy == "characters":
            overlap_chars = int(len(text) * percentage)
            if overlap_chars <= 0:
                return ""
            
            overlap_text = text[-overlap_chars:]
            # Ensure we don't break in the middle of a word
            if overlap_text and not overlap_text[0].isspace():
                first_space = overlap_text.find(' ')
                if first_space != -1:
                    overlap_text = overlap_text[first_space:].lstrip()
            
            return overlap_text
            
        elif strategy == "sentences":
            # Split into sentences and take the last N%
            sentences = re.split(r'[.!?]+', text)
            sentences = [s.strip() for s in sentences if s.strip()]
            
            if not sentences:
                return ""
            
            overlap_count = max(1, int(len(sentences) * percentage))
            overlap_sentences = sentences[-overlap_count:]
            
            return '. '.join(overlap_sentences) + '.'
            
        elif strategy == "paragraphs":
            # Split into paragraphs and take the last N%
            paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
            
            if not paragraphs:
                return ""
            
            overlap_count = max(1, int(len(paragraphs) * percentage))
            overlap_paragraphs = paragraphs[-overlap_count:]
            
            return '\n\n'.join(overlap_paragraphs)
        
        return ""
    
    # Second pass: create chunks with overlap
    for i in range(num_pages):
        current_text = page_texts[i]
        
        # Add overlap from previous page if available
        if i > 0 and overlap_percentage > 0:
            previous_text = page_texts[i - 1]
            overlap_text = get_overlap_text(previous_text, overlap_percentage, overlap_strategy)
            
            if overlap_text:
                # Combine overlap with current content using natural paragraph separation
                combined_text = f"{overlap_text}\n\n{current_text}"
            else:
                combined_text = current_text
        else:
            combined_text = current_text

        # Process image
        buffered = BytesIO()
        images[i].save(buffered, format="PNG")
        image_bytes = buffered.getvalue()
        public_url = upload_image_to_gcs(image_bytes, bucket_name="candlestick_bible")

        overlap_info = f"with {len(overlap_text) if i > 0 and overlap_percentage > 0 else 0} chars overlap" if i > 0 else "no overlap"
        print(f"Page {i + 1} - Original: {len(current_text)} chars, Combined: {len(combined_text)} chars ({overlap_info})")
        
        result.append({
            "page": i + 1,
            "text": combined_text,  # This now includes overlap
            "original_text": current_text,  # Keep original text for reference
            "image_data_url": public_url,
            "has_overlap": i > 0 and overlap_percentage > 0,
            "overlap_length": len(overlap_text) if i > 0 and overlap_percentage > 0 else 0,
            "overlap_strategy": overlap_strategy,
            "overlap_percentage": overlap_percentage,
        })
    
    # Save to JSON file if requested
    json_path = None
    if save_to_json and result:
        json_path = save_processed_data_to_json(result, original_filename)
    
    return result, json_path