import os
import sys
import json
import PyPDF2
import docx
from openai import OpenAI
import base64
from io import BytesIO
from dotenv import load_dotenv

load_dotenv()

# Initialize environment variables
iexec_out = os.environ['IEXEC_OUT']
iexec_in = os.environ.get('IEXEC_IN', '/iexec_in')
openai_api_key = os.environ.get('OPENAI_API_KEY')

# Initialize OpenAI client
if not openai_api_key:
    print("Warning: OPENAI_API_KEY not found. Using mock response for testing.")
    client = None
else:
    client = OpenAI(api_key=openai_api_key)

def extract_text_from_pdf(file_path):
    """Extract text content from PDF file"""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return None

def extract_text_from_docx(file_path):
    """Extract text content from DOCX file"""
    try:
        doc = docx.Document(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    except Exception as e:
        print(f"Error extracting DOCX text: {e}")
        return None

def extract_text_from_doc(file_path):
    """Extract text from DOC file (basic implementation)"""
    try:
        # For .doc files, you might need additional libraries like python-docx2txt
        # This is a placeholder - in production, consider using antiword or similar
        with open(file_path, 'rb') as file:
            content = file.read()
            # Basic text extraction - this is limited for .doc files
            text = content.decode('utf-8', errors='ignore')
        return text
    except Exception as e:
        print(f"Error extracting DOC text: {e}")
        return None

def analyze_legal_document(document_text, user_query):
    """Use OpenAI to analyze legal document based on user query"""
    if not client:
        return f"Mock Analysis: This would analyze the document for query: '{user_query}'. Document length: {len(document_text)} characters."
    
    try:
        system_prompt = """You are a specialized legal document assistant..."""
        
        user_prompt = f"""Legal Document Content:
        {document_text[:8000]}
        
        User Query: {user_query}
        
        Please analyze the document and provide a comprehensive response to the user's query."""
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=1500,
            temperature=0.3
        )
        
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error with OpenAI analysis: {e}")
        return f"Error analyzing document: {str(e)}"

def main():
    try:
        # Get user query from command line arguments
        if len(sys.argv) > 1:
            # Join all arguments after the script name
            user_query = " ".join(sys.argv[1:])
        else:
            user_query = "Please provide a summary of this legal document."
        
        print(f"Processing legal document analysis request: {user_query}")
        
        # Look for document files in iexec_in directory
        document_text = ""
        processed_files = []
        
        # Check for common legal document formats
        for root, dirs, files in os.walk(iexec_in):
            for file in files:
                file_path = os.path.join(root, file)
                file_ext = os.path.splitext(file)[1].lower()
                
                if file_ext == '.pdf':
                    text = extract_text_from_pdf(file_path)
                    if text:
                        document_text += f"\n--- Content from {file} ---\n{text}\n"
                        processed_files.append(file)
                        
                elif file_ext == '.docx':
                    text = extract_text_from_docx(file_path)
                    if text:
                        document_text += f"\n--- Content from {file} ---\n{text}\n"
                        processed_files.append(file)
                        
                elif file_ext == '.doc':
                    text = extract_text_from_doc(file_path)
                    if text:
                        document_text += f"\n--- Content from {file} ---\n{text}\n"
                        processed_files.append(file)
        
        if not document_text.strip():
            result = "No legal documents found or unable to extract text from provided files. Please ensure you've uploaded PDF, DOC, or DOCX files."
        else:
            print(f"Successfully extracted text from {len(processed_files)} file(s): {', '.join(processed_files)}")
            
            # Analyze document with OpenAI
            result = analyze_legal_document(document_text, user_query)
        
        print("Analysis completed successfully")
        
        # Create comprehensive response
        response_data = {
            "query": user_query,
            "processed_files": processed_files,
            "analysis": result,
            "timestamp": "2024-01-01T00:00:00Z"  # In production, use actual timestamp
        }
        
        # Write result to output file
        with open(iexec_out + '/result.txt', 'w+', encoding='utf-8') as fout:
            fout.write(result)
        
        # Write detailed JSON response
        with open(iexec_out + '/analysis.json', 'w+', encoding='utf-8') as fout:
            json.dump(response_data, fout, indent=2, ensure_ascii=False)
        
        # Declare computation completed
        with open(iexec_out + '/computed.json', 'w+') as f:
            json.dump({
                "deterministic-output-path": iexec_out + '/result.txt',
                "analysis-output-path": iexec_out + '/analysis.json'
            }, f)
            
        print(f"Results written to {iexec_out}")
        
    except Exception as e:
        error_msg = f"Error in legal document analysis: {str(e)}"
        print(error_msg)
        
        # Write error to output
        with open(iexec_out + '/result.txt', 'w+') as fout:
            fout.write(error_msg)
        
        # Still declare computed to complete the task
        with open(iexec_out + '/computed.json', 'w+') as f:
            json.dump({
                "deterministic-output-path": iexec_out + '/result.txt',
                "error": error_msg
            }, f)

if __name__ == "__main__":
    main()
