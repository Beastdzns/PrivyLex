import os
import PyPDF2
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import openai
from dotenv import load_dotenv

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")

MAX_CONTEXT_TOKENS = 3000 # Roughly, adjust based on model (GPT-3.5-turbo is 4096 total)

def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF file."""
    text = ""
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page_num in range(len(reader.pages)):
                page = reader.pages[page_num]
                text += page.extract_text() or ""
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return None
    return text

def get_text_chunks(text, chunk_size=1000, overlap=100):
    """Splits text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
        if end >= len(text):
            break
    return chunks

# --- RAG Components ---
# These will be instance-specific if you handle multiple docs,
# but for hackathon, we can keep them global and reset on new PDF.
document_chunks_store = {} # {pdf_filename: [chunks]}
vectorizer_store = {}      # {pdf_filename: TfidfVectorizer}
chunk_vectors_store = {}   # {pdf_filename: sparse_matrix}

def setup_rag_for_pdf(pdf_filename, pdf_path):
    """Processes PDF and sets up RAG components for a specific PDF."""
    global document_chunks_store, vectorizer_store, chunk_vectors_store
    
    text_content = extract_text_from_pdf(pdf_path)
    if not text_content:
        return False

    chunks = get_text_chunks(text_content)
    if not chunks:
        return False
    
    document_chunks_store[pdf_filename] = chunks
    
    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        chunk_vectors = vectorizer.fit_transform(chunks)
        vectorizer_store[pdf_filename] = vectorizer
        chunk_vectors_store[pdf_filename] = chunk_vectors
    except ValueError as e:
        print(f"TF-IDF Vectorization error for {pdf_filename}: {e}")
        # Clean up if vectorization fails for this PDF
        if pdf_filename in document_chunks_store: del document_chunks_store[pdf_filename]
        if pdf_filename in vectorizer_store: del vectorizer_store[pdf_filename]
        if pdf_filename in chunk_vectors_store: del chunk_vectors_store[pdf_filename]
        return False
    return True


def get_relevant_chunks_for_pdf(pdf_filename, query, top_n=3):
    """Retrieves top_n relevant chunks for a query from a specific PDF's RAG setup."""
    if pdf_filename not in document_chunks_store or \
       pdf_filename not in vectorizer_store or \
       pdf_filename not in chunk_vectors_store:
        print(f"RAG not set up for PDF: {pdf_filename}")
        return ""

    chunks = document_chunks_store[pdf_filename]
    vectorizer = vectorizer_store[pdf_filename]
    chunk_vectors = chunk_vectors_store[pdf_filename]

    if chunk_vectors is None or not chunks:
        print(f"No chunks or vectors available for {pdf_filename}")
        return ""

    query_vector = vectorizer.transform([query])
    similarities = cosine_similarity(query_vector, chunk_vectors).flatten()
    
    num_chunks_to_retrieve = min(top_n, len(chunks))
    if num_chunks_to_retrieve == 0:
        return ""
        
    relevant_indices = np.argsort(similarities)[-num_chunks_to_retrieve:][::-1]
    
    context = "\n\n".join([chunks[i] for i in relevant_indices if similarities[i] > 0.05])
    return context

def get_answer_from_llm(question, context):
    """Gets an answer from OpenAI LLM given a question and context."""
    if not openai.api_key:
        return "OpenAI API key not configured."

    max_context_chars = MAX_CONTEXT_TOKENS * 3 
    if len(context) > max_context_chars:
        context = context[:max_context_chars]

    prompt = f"""You are PrivyLex, a helpful AI assistant specialized in answering questions about legal documents.
Use ONLY the following provided context from a legal document to answer the question.
If the answer is not found in the context, state "The answer is not found in the provided document context."
Do not make up information or use external knowledge. Be concise and directly answer the question.

Context:
{context}

Question: {question}

Answer:"""

    try:
        # For openai < 1.0
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are PrivyLex, an AI assistant for legal document Q&A. Answer based SOLELY on the provided context."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=350, 
            temperature=0.1 
        )
        return response.choices[0].message['content'].strip()
        # If using openai >= 1.0, the API call is different:
        # from openai import OpenAI
        # client = OpenAI() # API key from env var OPENAI_API_KEY
        # response = client.chat.completions.create(
        # model="gpt-3.5-turbo",
        # messages=[
        #     {"role": "system", "content": "You are PrivyLex..."},
        #     {"role": "user", "content": prompt}
        # ],
        # max_tokens=350,
        # temperature=0.1
        # )
        # return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"Error calling OpenAI: {e}")
        return f"Error generating answer: {e}"

def clear_rag_stores():
    """Clears all stored RAG data. Call when a new PDF is uploaded to simplify for hackathon."""
    global document_chunks_store, vectorizer_store, chunk_vectors_store
    document_chunks_store.clear()
    vectorizer_store.clear()
    chunk_vectors_store.clear()
    print("RAG stores cleared.")