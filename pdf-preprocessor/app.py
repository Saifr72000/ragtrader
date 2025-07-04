from fastapi import FastAPI, UploadFile
from fastapi.responses import JSONResponse
from utils.pdf_processor import extract_pdf_data

app = FastAPI()

@app.post("/process")
async def process_pdf(file: UploadFile):
    contents = await file.read()
    result = extract_pdf_data(contents)
    return JSONResponse(content=result)