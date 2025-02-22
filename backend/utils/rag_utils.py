import os
from typing import List, Dict, Any
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.documents import Document
from pinecone import Pinecone as PineconeClient
from dotenv import load_dotenv
import hashlib

# Load environment variables
load_dotenv()

class RAGService:
    def __init__(self):
        # Initialize OpenAI
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.model_name = os.getenv("OPENAI_MODEL_NAME", "gpt-4-turbo-preview")
        self.embedding_model = os.getenv("EMBEDDING_MODEL_NAME", "text-embedding-3-small")
        
        # Initialize Pinecone
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.pinecone_index_name = os.getenv("PINECONE_INDEX_NAME")
        
        # Initialize components
        self._init_components()
        
    def _init_components(self):
        """Initialize LangChain components"""
        # Initialize Pinecone client
        self.pc = PineconeClient(api_key=self.pinecone_api_key)
        
        # Get the index
        self.index = self.pc.Index(self.pinecone_index_name)
        
        # Initialize embeddings
        self.embeddings = OpenAIEmbeddings(
            model=self.embedding_model,
            openai_api_key=self.openai_api_key
        )
        
        # Initialize Pinecone vectorstore
        self.vectorstore = PineconeVectorStore(
            index=self.index,
            embedding=self.embeddings,
            text_key="text",
            namespace="breeze_kb"  # Namespace for knowledge base documents
        )
        
        # Initialize retriever with metadata filtering
        self.retriever = self.vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={
                "k": 5,  # Retrieve top 5 most relevant chunks
                "filter": {"type": "knowledge_base"}  # Only retrieve from knowledge base
            }
        )
        
        # Initialize LLM
        self.llm = ChatOpenAI(
            model_name=self.model_name,
            temperature=0,
            openai_api_key=self.openai_api_key
        )
        
        # Create prompt template with more context
        template = """You are a helpful AI assistant for the Breeze support system. Your role is to assist users by providing accurate information based on the knowledge base.

        Use the following retrieved documents to answer the question. If the documents don't contain enough information to provide a complete answer, acknowledge what you know and what you're unsure about.
        If you don't know the answer or if the context doesn't provide relevant information, just say so. Don't try to make up information.

        Retrieved Knowledge Base Documents:
        {context}

        Question: {question}

        Instructions:
        1. Base your answer only on the provided documents
        2. If citing specific information, mention which document it came from
        3. If the answer is unclear from the documents, say so
        4. Keep the response concise but informative

        Answer: """
        
        self.prompt = ChatPromptTemplate.from_template(template)
        
        # Create RAG chain with error handling
        self.chain = (
            {
                "context": self.retriever, 
                "question": RunnablePassthrough()
            }
            | self.prompt 
            | self.llm 
            | StrOutputParser()
        )

    def _generate_stable_id(self, content: str, prefix: str = "") -> str:
        """Generate a stable ID for a piece of content"""
        content_hash = hashlib.sha256(content.encode()).hexdigest()[:16]
        return f"{prefix}_{content_hash}" if prefix else content_hash
    
    async def query(self, question: str) -> str:
        """
        Query the RAG system with a question
        
        Args:
            question (str): The question to ask
            
        Returns:
            str: The generated response
            
        Raises:
            Exception: If there's an error processing the query
        """
        try:
            print(f"Processing query: {question}")
            response = await self.chain.ainvoke(question)
            print(f"Generated response successfully")
            return response
            
        except Exception as e:
            error_msg = str(e)
            if "rate limit" in error_msg.lower():
                print(f"OpenAI API rate limit exceeded: {error_msg}")
                raise Exception("Rate limit exceeded. Please try again in a moment.")
            elif "maximum context length" in error_msg.lower():
                print(f"Context length exceeded: {error_msg}")
                raise Exception("The query context is too long. Please try a shorter query or reduce the context window.")
            else:
                print(f"Error querying RAG system: {error_msg}")
                raise
    
    async def add_documents(self, texts: List[str], metadata: List[Dict[str, Any]] = None):
        """
        Add documents to the vector store
        
        Args:
            texts (List[str]): List of text documents to add
            metadata (List[Dict[str, Any]], optional): Metadata for each document
        """
        try:
            if metadata is None:
                metadata = [{"type": "knowledge_base"} for _ in texts]
            else:
                # Ensure each metadata dict has the type field
                for meta in metadata:
                    meta["type"] = meta.get("type", "knowledge_base")
            
            # Create Document objects
            documents = [
                Document(page_content=text, metadata=meta)
                for text, meta in zip(texts, metadata)
            ]
            
            # Add documents to vectorstore
            await self.vectorstore.aadd_documents(documents)
            print(f"Successfully added {len(texts)} documents to the vector store")
            
        except Exception as e:
            print(f"Error adding documents to vector store: {str(e)}")
            raise

    async def upsert_knowledge_base_files(self, files: List[Dict[str, Any]]):
        """
        Upsert knowledge base files to Pinecone
        
        Args:
            files: List of dictionaries containing file information:
                  [{"content": str, "title": str, "path": str, "metadata": dict}]
        """
        vectors = []
        
        for file in files:
            embedding = await self.embeddings.aembed_query(file["content"])
            vector = {
                "id": self._generate_stable_id(file["content"], "kb"),
                "values": embedding,
                "metadata": {
                    "type": "knowledge_base",
                    "title": file["title"],
                    "path": file["path"],
                    "text": file["content"],  # Store as text for retrieval
                    "content": file["content"],  # Keep content in metadata for backward compatibility
                    **file.get("metadata", {})
                }
            }
            vectors.append(vector)
        
        self.index.upsert(vectors=vectors, namespace="breeze_kb")
        print(f"Upserted {len(vectors)} knowledge base files to Pinecone")
    
    async def upsert_tickets(self, tickets: List[Dict[str, Any]]):
        """
        Upsert tickets to Pinecone
        
        Args:
            tickets: List of dictionaries containing ticket information:
                    [{"content": str, "title": str, "id": str, "metadata": dict}]
        """
        vectors = []
        
        for ticket in tickets:
            full_content = f"Title: {ticket['title']}\n\nContent: {ticket['content']}"
            embedding = await self.embeddings.aembed_query(full_content)
            
            vector = {
                "id": self._generate_stable_id(full_content, f"ticket_{ticket['id']}"),
                "values": embedding,
                "metadata": {
                    "type": "ticket",
                    "ticket_id": ticket["id"],
                    "title": ticket["title"],
                    "content": ticket["content"],
                    **ticket.get("metadata", {})
                }
            }
            vectors.append(vector)
        
        self.index.upsert(vectors=vectors, namespace="breeze_tickets")
        print(f"Upserted {len(vectors)} tickets to Pinecone")
    
    async def delete_by_ids(self, ids: List[str], namespace: str):
        """
        Delete vectors by their IDs from a specific namespace
        
        Args:
            ids: List of vector IDs to delete
            namespace: Namespace to delete from ("breeze_kb" or "breeze_tickets")
        """
        self.index.delete(ids=ids, namespace=namespace)
        print(f"Deleted {len(ids)} vectors from namespace {namespace}")

# Initialize RAG service as a singleton
rag_service = RAGService() 