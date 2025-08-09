from fastapi import FastAPI, UploadFile, Query, File, Form
from fastapi.responses import JSONResponse
from utils.pdf_processor import extract_pdf_data, analyze_overlap_effectiveness
from utils.gcs_uploader import upload_image_to_gcs

app = FastAPI()

@app.post("/process")
async def process_pdf(
    file: UploadFile,
    overlap_percentage: float = Query(default=0.2, ge=0.0, le=1.0, description="Percentage of previous page content to include (0.0 to 1.0)"),
    overlap_strategy: str = Query(default="characters", description="Strategy for overlap calculation: characters, sentences, or paragraphs"),
    include_analysis: bool = Query(default=False, description="Include overlap analysis in response"),
    save_to_json: bool = Query(default=True, description="Save processed data to local JSON file")
):
    """
    Process PDF with configurable chunk overlapping.
    
    Args:
        file: PDF file to process
        overlap_percentage: Percentage of previous page content to include (0.0 to 1.0)
        overlap_strategy: Strategy for overlap calculation (characters, sentences, paragraphs)
        include_analysis: Whether to include overlap effectiveness analysis
        save_to_json: Whether to save processed data to local JSON file
    """
    contents = await file.read()
    result, json_path = extract_pdf_data(
        contents, 
        overlap_percentage, 
        overlap_strategy, 
        save_to_json=save_to_json,
        original_filename=file.filename or "document.pdf"
    )
    
    response_data = {
        "chunks": result,
        "total_pages": len(result),
        "json_file_path": json_path
    }
    
    if include_analysis:
        analysis = analyze_overlap_effectiveness(result)
        response_data["overlap_analysis"] = analysis
    
    return JSONResponse(content=response_data)

@app.post("/analyze-overlap")
async def analyze_overlap(
    file: UploadFile,
    overlap_percentage: float = Query(default=0.2, ge=0.0, le=1.0),
    overlap_strategy: str = Query(default="characters")
):
    """
    Analyze the effectiveness of chunk overlapping without processing images.
    """
    contents = await file.read()
    result, json_path = extract_pdf_data(
        contents, 
        overlap_percentage, 
        overlap_strategy, 
        save_to_json=False  # Don't save for analysis endpoint
    )
    analysis = analyze_overlap_effectiveness(result)
    
    return JSONResponse(content={
        "analysis": analysis,
        "sample_chunks": result[:2] if len(result) >= 2 else result,  # Include first 2 chunks as samples
        "json_file_path": json_path
    })


@app.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    folder: str = Form("images")
):
   
   image_bytes = await file.read()
   url = upload_image_to_gcs(image_bytes, "candlestick_bible", folder=folder)
   return {"url": url}