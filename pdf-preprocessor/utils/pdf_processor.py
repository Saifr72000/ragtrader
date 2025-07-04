import fitz  # PyMuPDF
import base64
from pdf2image import convert_from_bytes
from io import BytesIO

def extract_pdf_data(pdf_bytes):
    print("Extracting PDF data...")
    result = []

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    images = convert_from_bytes(pdf_bytes, dpi=300)

    #images = convert_from_bytes(pdf_bytes, dpi=300, first_page=1, last_page=11)


    # Limit to first 5 pages or less if the document is shorter
    #num_pages = min(11, doc.page_count)
    num_pages = doc.page_count

    for i in range(num_pages):
        page = doc.load_page(i)
        text = page.get_text("text").strip()

        buffered = BytesIO()
        images[i].save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
        image_data_url = f"data:image/png;base64,{img_base64}"

        print(f"Page {i + 1} ")

        result.append({
            "page": i + 1,
            "text": text,
            #"image_data_url": image_data_url,
        })
        
    
    return result
