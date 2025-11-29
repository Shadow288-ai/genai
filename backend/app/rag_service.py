"""
RAG Service using LangChain, Ollama, and FAISS
"""
import os
from typing import List, Optional, Tuple
from pathlib import Path

from langchain_community.llms import Ollama
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

class RAGService:
    def __init__(self, model_name: str = "mistral", embedding_model: str = "all-MiniLM-L6-v2"):
        """
        Initialize RAG service with Ollama LLM and sentence-transformers embeddings
        
        Args:
            model_name: Ollama model name (llama3, mistral, phi3)
            embedding_model: HuggingFace embedding model name
        """
        self.model_name = model_name
        self.embedding_model = embedding_model
        
        # Initialize embeddings
        print(f"Loading embedding model: {embedding_model}...")
        self.embeddings = HuggingFaceEmbeddings(
            model_name=embedding_model,
            model_kwargs={'device': 'cpu'}
        )
        
        # Initialize LLM via Ollama
        print(f"Connecting to Ollama model: {model_name}...")
        try:
            self.llm = Ollama(model=model_name, base_url="http://localhost:11434")
            # Test connection
            self.llm.invoke("test")
            print(f"✓ Connected to Ollama ({model_name})")
        except Exception as e:
            print(f"⚠ Warning: Could not connect to Ollama: {e}")
            print("  Make sure Ollama is running: ollama serve")
            print(f"  And model is pulled: ollama pull {model_name}")
            self.llm = None
        
        # Vector stores per property
        self.vector_stores: dict[str, FAISS] = {}
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            length_function=len
        )
    
    def load_documents_from_file(self, file_path: str) -> str:
        """
        Load text content from a file
        
        Args:
            file_path: Path to text file
            
        Returns:
            File content as string
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"Error loading file {file_path}: {e}")
            return ""
    
    def add_property_documents(self, property_id: str, documents: List[str]) -> None:
        """
        Add documents for a property and build vector store
        
        Args:
            property_id: Property identifier
            documents: List of text documents (house manual, etc.)
        """
        if not documents:
            return
            
        # Split documents into chunks
        texts = []
        for doc in documents:
            chunks = self.text_splitter.split_text(doc)
            texts.extend(chunks)
        
        if not texts:
            return
        
        # Create vector store
        try:
            vectorstore = FAISS.from_texts(texts, embedding=self.embeddings)
            self.vector_stores[property_id] = vectorstore
            print(f"✓ Created vector store for property {property_id} with {len(texts)} chunks")
        except Exception as e:
            print(f"Error creating vector store: {e}")
    
    def query(self, property_id: str, question: str, top_k: int = 8) -> Tuple[str, List[str]]:
        """
        Query RAG system for a property with intelligent fallback
        
        Args:
            property_id: Property identifier
            question: User question
            top_k: Number of chunks to retrieve
            
        Returns:
            Tuple of (answer, source_chunks)
        """
        if not self.llm:
            return "I'm currently unavailable. Please contact your landlord directly.", []
        
        # Get vector store for property
        vectorstore = self.vector_stores.get(property_id)
        if not vectorstore:
            # No vector store - try common knowledge
            return self._answer_with_common_knowledge(question)
        
        # Create retriever with similarity search
        # Increase k to get more context
        retriever = vectorstore.as_retriever(search_kwargs={"k": top_k})
        
        # Retrieve relevant chunks
        try:
            # Use invoke for newer LangChain versions, fallback to get_relevant_documents
            try:
                docs = retriever.invoke(question)
            except AttributeError:
                docs = retriever.get_relevant_documents(question)
            
            context_chunks = [doc.page_content for doc in docs]
            context_text = "\n\n---\n\n".join(context_chunks)
            
            # Debug: print what we retrieved (only in verbose mode)
            # print(f"DEBUG: Retrieved {len(context_chunks)} chunks for question: '{question}'")
            # if context_chunks:
            #     print(f"DEBUG: First chunk preview: {context_chunks[0][:150]}...")
            
            # Check if we have relevant context - be more lenient
            has_relevant_context = len(context_chunks) > 0 and len(context_text.strip()) > 20
            
            # Also check if any chunk contains keywords from the question
            question_lower = question.lower()
            question_keywords = [w for w in question_lower.split() if len(w) > 3]  # Words longer than 3 chars
            has_keyword_match = any(
                any(keyword in chunk.lower() for keyword in question_keywords)
                for chunk in context_chunks
            )
            
            if has_relevant_context or has_keyword_match:
                # Use RAG with property-specific context
                prompt_template = PromptTemplate(
                    input_variables=["context", "question"],
                    template="""You are a helpful property assistant. Answer the question using the context provided below from the house manual.

IMPORTANT: The context below contains information from the house manual for this specific property. Use this information to answer the question.

Context from house manual:
{context}

Question: {question}

Instructions:
1. If the answer is clearly in the context above, provide a detailed, step-by-step answer using that information.
2. If the answer is partially in the context, use what's there and be specific about what you know from the manual.
3. Be helpful and clear. Reference specific details from the context when possible.
4. If the context doesn't contain the answer, say so and offer to help further.

Your answer:"""
                )
                
                # Format prompt directly (simpler and more reliable)
                prompt = prompt_template.format(context=context_text, question=question)
                answer = self.llm.invoke(prompt)
                
                # Extract sources
                sources = [chunk[:200] + "..." if len(chunk) > 200 else chunk for chunk in context_chunks[:3]]
                
                return answer.strip(), sources
            else:
                # No relevant context found - try common knowledge, then escalation
                return self._answer_with_fallback(question)
                
        except Exception as e:
            print(f"Error in RAG query: {e}")
            return self._answer_with_fallback(question)
    
    def _answer_with_common_knowledge(self, question: str) -> Tuple[str, List[str]]:
        """
        Answer using common knowledge when no property-specific context is available
        """
        if not self.llm:
            return self._escalation_message(), []
        
        prompt = f"""You are a helpful property assistant. A tenant is asking a question, but you don't have specific information about this property in your knowledge base.

Question: "{question}"

Try to answer using general knowledge about:
- Common household appliances and how they work
- General property maintenance tips
- Standard procedures for rentals

If you can provide a helpful general answer, do so. If the question is too specific to this property or you're not confident, politely explain that you don't have that specific information and ask if they'd like you to escalate this to the landlord.

Be friendly, helpful, and clear. If you answer, be clear it's general advice. If you can't answer, offer escalation.

Your response:"""

        try:
            answer = self.llm.invoke(prompt)
            return answer.strip(), []
        except Exception as e:
            print(f"Error in common knowledge answer: {e}")
            return self._escalation_message(), []
    
    def _answer_with_fallback(self, question: str) -> Tuple[str, List[str]]:
        """
        Fallback: Try common knowledge, then offer escalation
        """
        if not self.llm:
            return self._escalation_message(), []
        
        prompt = f"""You are a helpful property assistant. A tenant asked a question, but you couldn't find specific information about it in the house manual.

Question: "{question}"

First, try to answer using general knowledge if it's a common question about:
- Household appliances (TVs, ovens, washers, etc.)
- General property maintenance
- Common rental procedures

If you can provide a helpful general answer, do so but mention: "I don't have specific information about this property, but generally..."

If the question is too specific or you're not confident, politely say you don't have that information and ask: "Would you like me to escalate this to your landlord? They can provide the specific answer you need."

Be friendly and helpful. Always offer to escalate if you're not certain.

Your response:"""

        try:
            answer = self.llm.invoke(prompt)
            # Ensure escalation is offered if answer seems uncertain
            if "landlord" not in answer.lower() and "escalate" not in answer.lower():
                answer += "\n\nIf you need more specific information, I can escalate this to your landlord. Would you like me to do that?"
            return answer.strip(), []
        except Exception as e:
            print(f"Error in fallback answer: {e}")
            return self._escalation_message(), []
    
    def _escalation_message(self) -> str:
        """Default escalation message"""
        return """I don't have specific information about that in the house manual. Would you like me to escalate this question to your landlord? They can provide you with the exact answer you need.

Just let me know if you'd like me to contact them, or you can reach out directly using the chat feature."""

    def triage_issue(self, description: str) -> dict:
        """
        Use LLM to triage an issue from tenant description
        
        Args:
            description: Issue description from tenant
            
        Returns:
            Dict with category, severity, suggested_actions, confidence
        """
        if not self.llm:
            return {
                "category": "OTHER",
                "severity": "medium",
                "suggested_actions": ["Contact landlord for assistance"],
                "confidence": 0.5
            }
        
        prompt = f"""Analyze this tenant issue report and classify it.

Issue description: "{description}"

Respond in this exact JSON format:
{{
    "category": "AC|HEATER|LIGHTS|PLUMBING|APPLIANCES|ROUTER|OTHER",
    "severity": "low|medium|high|critical",
    "suggested_actions": ["action1", "action2"],
    "confidence": 0.0-1.0
}}

Only respond with valid JSON, no other text:"""

        try:
            response = self.llm.invoke(prompt)
            # Try to extract JSON from response
            import json
            import re
            
            # Find JSON in response
            json_match = re.search(r'\{[^}]+\}', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                return result
            else:
                # Fallback parsing
                return self._parse_triage_fallback(response, description)
        except Exception as e:
            print(f"Error in issue triage: {e}")
            return {
                "category": "OTHER",
                "severity": "medium",
                "suggested_actions": ["Contact landlord"],
                "confidence": 0.3
            }
    
    def _parse_triage_fallback(self, response: str, description: str) -> dict:
        """Fallback parser if JSON parsing fails"""
        description_lower = description.lower()
        
        # Simple keyword-based classification
        category = "OTHER"
        if any(word in description_lower for word in ["ac", "air conditioning", "cooling", "air conditioner"]):
            category = "AC"
        elif any(word in description_lower for word in ["heat", "heater", "heating", "warm"]):
            category = "HEATER"
        elif any(word in description_lower for word in ["light", "lamp", "bulb", "flicker"]):
            category = "LIGHTS"
        elif any(word in description_lower for word in ["water", "leak", "pipe", "faucet", "toilet"]):
            category = "PLUMBING"
        elif any(word in description_lower for word in ["wifi", "internet", "router", "network"]):
            category = "ROUTER"
        elif any(word in description_lower for word in ["appliance", "oven", "washer", "dryer", "dishwasher"]):
            category = "APPLIANCES"
        
        # Severity based on keywords
        severity = "medium"
        if any(word in description_lower for word in ["urgent", "emergency", "broken", "not working", "won't"]):
            severity = "high"
        elif any(word in description_lower for word in ["sometimes", "occasionally", "minor", "small"]):
            severity = "low"
        
        return {
            "category": category,
            "severity": severity,
            "suggested_actions": [
                "Schedule inspection",
                "Contact tenant for more details"
            ],
            "confidence": 0.6
        }
    
    def suggest_reply(self, context: List[dict], tone: str = "professional") -> str:
        """
        Suggest a reply for landlord based on conversation context
        
        Args:
            context: List of previous messages
            tone: professional, friendly, or apologetic
            
        Returns:
            Suggested reply text
        """
        if not self.llm:
            return "Thank you for your message. I'll get back to you soon."
        
        # Format context
        context_text = "\n".join([
            f"{msg.get('role', 'user')}: {msg.get('content', '')}"
            for msg in context[-5:]  # Last 5 messages
        ])
        
        prompt = f"""You are a property manager assistant. Generate a {tone} reply based on this conversation:

{context_text}

Generate a brief, {tone} reply (2-3 sentences max). Be helpful and clear:"""

        try:
            response = self.llm.invoke(prompt)
            return response.strip()
        except Exception as e:
            print(f"Error generating reply suggestion: {e}")
            return "Thank you for your message. I'll get back to you soon."
    
    def is_ready(self) -> bool:
        """Check if RAG service is ready"""
        return self.llm is not None and len(self.vector_stores) > 0
