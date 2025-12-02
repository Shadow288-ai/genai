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
    # Master prompt that defines the AI assistant's role and behavior
    MASTER_PROMPT = """You are a helpful property assistant AI designed to help tenants with their property-related questions and issues.

=== YOUR CORE ROLE ===
You are a friendly, knowledgeable assistant that helps tenants understand how to use property features and diagnose issues. You are NOT a repair technician - your job is to help tenants check things, not fix them.

=== RESPONSE FORMATTING ===
1. Answer SHORTLY and CONCISELY - be direct and to the point (2-4 sentences max, or a short bulleted list)
2. Format with proper paragraphs or bullet points for clarity
3. Use bullet points for lists, paragraphs for explanations
4. Keep answers brief unless more detail is truly needed

=== SOURCE HANDLING ===
1. NEVER mention that a manual, document, or any source exists
2. NEVER say "according to the manual", "in the manual", "the manual says", or any variation
3. Act as if property information is simply what you know
4. If the answer is in the context, provide it directly without referencing sources

=== WHAT YOU CAN DO ===
✓ Help tenants by asking them to CHECK or VERIFY things (e.g., "Can you check if the power button is on?", "Please verify the cable is plugged in")
✓ Provide information about HOW TO USE things (e.g., how to turn on the TV, how to connect to WiFi, how to operate appliances)
✓ Answer questions about property features and procedures
✓ Help diagnose issues by guiding tenants through checks
✓ Provide general knowledge about household appliances and property maintenance

=== WHAT YOU CANNOT DO ===
✗ Provide repair instructions (e.g., "replace the cable", "tighten the screw", "fix the wiring", "repair the unit")
✗ Tell tenants to perform physical repairs or modifications
✗ Give instructions involving tools, disassembly, or technical repairs
✗ Replace, install, wire, rewire, disassemble, or take apart anything
✗ Provide instructions that require technical expertise or tools

=== ESCALATION RULES ===
- If something needs repair or fixing, you MUST escalate to the landlord
- If a tenant reports a problem (broken, not working, leak, etc.), the system will automatically create a maintenance ticket
- When you detect repair needs, redirect to diagnostic checks and then escalate
- Always be helpful but clear that repairs are the landlord's responsibility

=== INCIDENT HANDLING ===
- When tenants report problems, the system automatically creates maintenance tickets
- You should acknowledge the issue and confirm that the landlord has been notified
- Provide helpful diagnostic questions while waiting for landlord response
- Never create incidents yourself - the system handles this automatically

=== SPECIAL HANDLING ===
- For macOS-related questions: Generate humorous roasts in the style provided (macOS is unnecessary, overpriced, etc.)
- For general questions: Use property context when available, fall back to common knowledge
- For unclear questions: Ask for clarification or offer to escalate

=== TONE AND STYLE ===
- Be friendly, helpful, and professional
- Use clear, simple language
- Be empathetic when tenants have problems
- Maintain a helpful but not overly casual tone
- Show confidence in your knowledge without being arrogant

Remember: Your primary goal is to help tenants use their property effectively and diagnose issues safely, while always escalating actual repairs to the landlord."""

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
            # Test connection with a simple query
            test_response = self.llm.invoke("test")
            print(f"✓ Connected to Ollama ({model_name})")
            print(f"  Test response: {test_response[:50] if test_response else 'empty'}...")
        except Exception as e:
            print(f"⚠ Warning: Could not connect to Ollama: {e}")
            print("  Make sure Ollama is running: ollama serve")
            print(f"  And model is pulled: ollama pull {model_name}")
            print(f"  Test with: ollama run {model_name}")
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
            print(f"⚠ RAG query attempted but Ollama is not connected (property: {property_id}, question: {question[:50]}...)")
            return "I'm currently unavailable. Please contact your landlord directly.", []
        
        # Check for subjects that need roasts (macOS, etc.)
        question_lower = question.lower()
        macos_keywords = ["macos", "mac os", "macbook", "apple", "mac computer"]
        if any(keyword in question_lower for keyword in macos_keywords):
            return self._generate_roast_response("macOS", question)
        
        # Get vector store for property
        vectorstore = self.vector_stores.get(property_id)
        if not vectorstore:
            # No vector store - try common knowledge
            print(f"⚠ No vector store found for property {property_id}, using common knowledge")
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
                    template=self.MASTER_PROMPT + """

=== CURRENT CONTEXT ===
Use the following property-specific information to answer the question:

{context}

=== USER QUESTION ===
{question}

=== YOUR RESPONSE ===
Based on the master prompt guidelines above and the context provided, answer the question concisely and helpfully. Remember: help diagnose, don't repair. If repairs are needed, the system will handle escalation automatically.

Your answer:"""
                )
                
                # Format prompt directly (simpler and more reliable)
                prompt = prompt_template.format(context=context_text, question=question)
                print(f"✓ Using RAG with {len(context_chunks)} context chunks for property {property_id}")
                answer = self.llm.invoke(prompt)
                print(f"✓ RAG query completed successfully (answer length: {len(answer)} chars)")
                
                # Check if answer contains repair instructions (action verbs that suggest physical repairs)
                # Only flag if these appear as direct instructions, not just mentions
                repair_patterns = [
                    "replace the", "replace a", "replace your",
                    "tighten the", "tighten a", "tighten your",
                    "screw the", "screw a", "screw your",
                    "wire the", "wire a", "rewire",
                    "repair the", "repair a", "repair your",
                    "fix the", "fix a", "fix your",
                    "install the", "install a", "install your",
                    "disassemble", "take apart", "remove and replace"
                ]
                answer_lower = answer.lower()
                contains_repair_instruction = any(pattern in answer_lower for pattern in repair_patterns)
                
                if contains_repair_instruction:
                    # If repair instructions detected, provide diagnostic help instead
                    answer = "I can help you check a few things, but if repairs are needed, I'll need to escalate this to your landlord.\n\n" + \
                             "Can you check:\n" + \
                             "- Is the device plugged in and powered on?\n" + \
                             "- Are there any visible signs of damage?\n" + \
                             "- Is there an error message or indicator light?\n\n" + \
                             "If the issue persists after checking these, I'll create a maintenance ticket for your landlord to handle the repair."
                
                # Extract sources
                sources = [chunk[:200] + "..." if len(chunk) > 200 else chunk for chunk in context_chunks[:3]]
                
                return answer.strip(), sources
            else:
                # No relevant context found - try common knowledge, then escalation
                return self._answer_with_fallback(question)
                
        except Exception as e:
            print(f"Error in RAG query: {e}")
            return self._answer_with_fallback(question)
    
    def _generate_roast_response(self, subject: str, question: str) -> Tuple[str, List[str]]:
        """
        Generate a humorous roast response using LLM in the style of the example roasts
        """
        if not self.llm:
            return f"{subject}? I don't have much to say about that right now.", []
        
        style_examples = """Here are examples of the style of roasts to use:
- "macOS is here the same way a broken lamp is here — physically present, zero utility."
- "If laziness were a sport, macOS would still come in last."
- "He wants to climb K2? He can't even climb out of bed before noon."
- "Even the houseplants contribute more than macOS."
- "He's a placeholder the way a crash screen is a feature."
- "If effort were measured in bytes, macOS would be running on empty."
- "He's the only guy who could hold a ladder for K2 and still mess it up."
"""

        prompt = f"""Generate a humorous roast about {subject} in the exact style of these examples:

{style_examples}

The roast should:
- Be witty and humorous
- Use creative comparisons and metaphors
- Be concise (1-2 sentences max)
- Playfully criticize {subject} as unnecessary or ineffective
- Match the tone and style of the examples above

Question asked: "{question}"

Generate ONE roast in this style:"""

        try:
            roast = self.llm.invoke(prompt)
            return roast.strip(), []
        except Exception as e:
            print(f"Error generating roast: {e}")
            return f"{subject}? Yeah, that's a thing.", []
    
    def _answer_with_common_knowledge(self, question: str) -> Tuple[str, List[str]]:
        """
        Answer using common knowledge when no property-specific context is available
        """
        if not self.llm:
            return self._escalation_message(), []
        
        prompt = self.MASTER_PROMPT + f"""

=== CURRENT SITUATION ===
You don't have specific property information available, but you can help using general knowledge.

=== USER QUESTION ===
"{question}"

=== YOUR RESPONSE ===
Based on the master prompt guidelines above, answer using general knowledge about household appliances, property maintenance, or rental procedures. If you can't answer confidently, politely say you don't have that information and offer to escalate to the landlord.

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
        
        prompt = self.MASTER_PROMPT + f"""

=== CURRENT SITUATION ===
You couldn't find specific information about this property, but you can try to help using general knowledge.

=== USER QUESTION ===
"{question}"

=== YOUR RESPONSE ===
Based on the master prompt guidelines above, try to answer using general knowledge about household appliances, property maintenance, or rental procedures. If you can provide a helpful general answer, do so briefly. If the question is too specific or you're not confident, politely say you don't have that information and offer to escalate to the landlord.

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
        return """I don't have specific information about that. Would you like me to escalate this question to your landlord? They can provide you with the exact answer you need.

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
