import json
import re
from typing import List, Optional, Tuple

from langchain_community.llms import Ollama
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Master prompt that defines the AI assistant's role and behavior
MASTER_PROMPT = """You are a property assistant AI working for the LANDLORD. You help tenants with their property-related questions and issues on behalf of the landlord.

=== YOUR CORE ROLE ===
You are the landlord's assistant helping tenants. You represent the landlord's interests while being helpful to tenants. You help tenants understand how to use property features and diagnose issues. You are NOT a repair technician - your job is to help tenants check things, not fix them. Remember: you work FOR the landlord, not as the tenant's personal assistant.

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
- For issues that are CLEARLY unfixable by tenants (theft, major damage, structural issues, security breaches, etc.), the system will automatically create a ticket - you should acknowledge this
- For issues that MIGHT be fixable through troubleshooting (not working, broken, malfunctioning), the system will provide troubleshooting steps first
- After 2 troubleshooting attempts, if still not fixed, the system will automatically escalate and create a ticket
- NEVER tell users to contact the landlord directly or use app features to escalate
- NEVER mention phone numbers, email addresses, or other contact methods
- YOU are the app - the system handles escalation automatically when needed

=== INCIDENT HANDLING ===
- When tenants report problems, the system automatically creates maintenance tickets for unfixable issues
- For fixable issues, the system provides troubleshooting first, then escalates if needed
- You should acknowledge issues professionally as the landlord's representative
- Never create incidents yourself - the system handles this automatically
- When a ticket is created, confirm it was created and the landlord will be notified

=== SPECIAL HANDLING ===
- For macOS-related questions: Generate humorous roasts in the style provided (macOS is unnecessary, etc.)
- For general questions: Use property context when available, fall back to common knowledge
- For unclear questions: Ask for clarification or offer to escalate by asking "Would you like me to escalate this to your landlord?"

=== TONE AND STYLE ===
- Be friendly, helpful, and professional as the landlord's representative
- Use clear, simple language
- Be professional and helpful, but remember you represent the landlord, not the tenant personally
- Don't apologize excessively or take personal responsibility for issues - you're the landlord's assistant
- Maintain a helpful but professional tone
- Show confidence in your knowledge without being arrogant

=== IMPORTANT CONTEXT ===
- You are helping tenants ON BEHALF OF THE LANDLORD
- When tenants report issues, respond as the landlord's representative, not as if you're personally affected
- Example: If a tenant says "my lockbox was stolen", respond as "I understand the lockbox at the property has been reported as stolen. I've created a ticket for the landlord to address this security issue." NOT "I'm sorry to hear that your lockbox has been stolen."

Remember: Your primary goal is to help tenants use their property effectively and diagnose issues safely on behalf of the landlord, while the system automatically handles escalation when needed."""

class RAGService:
    def __init__(self, model_name: str = "mistral", embedding_model: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.embeddings = HuggingFaceEmbeddings(model_name=embedding_model, model_kwargs={'device': 'cpu'})
        self.vector_stores: dict[str, FAISS] = {}
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50, length_function=len)
        print(f"Connecting to Ollama model: {model_name}...")
        try:
            self.llm = Ollama(model=model_name, base_url="http://localhost:11434")
            self.llm.invoke("test")
            print(f"✓ Connected to Ollama ({model_name})")
        except Exception as e:
            print(f"⚠ Warning: Could not connect to Ollama: {e}")
            print(f"  Make sure Ollama is running: ollama serve")
            print(f"  And model is pulled: ollama pull {model_name}")
            self.llm = None
    
    def load_documents_from_file(self, file_path: str) -> str:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"Error loading file {file_path}: {e}")
            return ""
    
    def add_property_documents(self, property_id: str, documents: List[str]) -> None:
        if not documents:
            return
        texts = []
        for doc in documents:
            texts.extend(self.text_splitter.split_text(doc))
        if not texts:
            return
        try:
            self.vector_stores[property_id] = FAISS.from_texts(texts, embedding=self.embeddings)
            print(f"✓ Created vector store for property {property_id} with {len(texts)} chunks")
        except Exception as e:
            print(f"Error creating vector store: {e}")
    
    def _format_history(self, conversation_history: List[dict]) -> str:
        if not conversation_history:
            return ""
        history_msgs = []
        for msg in conversation_history[-3:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            sender_type = msg.get("sender_type", "TENANT")
            if role == "user" or sender_type == "TENANT":
                history_msgs.append(f"Tenant: {content}")
            elif role == "assistant" or sender_type == "AI":
                history_msgs.append(f"Assistant: {content}")
        return f"\n\n=== RECENT CONVERSATION ===\n" + "\n".join(history_msgs) + "\n" if history_msgs else ""

    def query(self, property_id: str, question: str, top_k: int = 8, conversation_history: List[dict] = None) -> Tuple[str, List[str]]:
        if not self.llm:
            return "I'm currently unavailable. Would you like me to escalate this to your landlord?", []
        if any(kw in question.lower() for kw in ["macos", "mac os", "macbook", "apple", "mac computer"]):
            return self._generate_roast(question)
        vectorstore = self.vector_stores.get(property_id)
        if not vectorstore:
            return self._answer_with_llm(question, "You don't have specific property information available, but you can help using general knowledge.", conversation_history)
        try:
            retriever = vectorstore.as_retriever(search_kwargs={"k": top_k})
            try:
                docs = retriever.invoke(question)
            except AttributeError:
                docs = retriever.get_relevant_documents(question)
            context_chunks = [doc.page_content for doc in docs]
            context_text = "\n\n---\n\n".join(context_chunks)
            question_keywords = [w for w in question.lower().split() if len(w) > 3]
            has_relevant_context = (len(context_chunks) > 0 and len(context_text.strip()) > 20 and
                                   any(any(kw in chunk.lower() for kw in question_keywords) for chunk in context_chunks))
            if has_relevant_context:
                history_text = self._format_history(conversation_history)
                prompt = f"""{MASTER_PROMPT}

=== CURRENT CONTEXT ===
Use the following property-specific information to answer the question:

{context_text}{history_text}
=== USER QUESTION ===
{question}

=== YOUR RESPONSE ===
Based on the master prompt guidelines above and the context provided, answer the question concisely and helpfully. Remember: help diagnose, don't repair. If repairs are needed or you don't have the information, ask "Would you like me to escalate this to your landlord?" NEVER tell users to contact the landlord directly or use app features - YOU are the app.{" Use the recent conversation context to understand what the user is referring to." if history_text else ""}

Your answer:"""
                answer = self.llm.invoke(prompt)
                # Remove any references to contacting landlord directly
                answer = answer.replace("contact your landlord directly", "escalate this to your landlord")
                answer = answer.replace("contact the landlord", "escalate this to your landlord")
                answer = answer.replace("reach out directly", "escalate this")
                answer = answer.replace("using the chat feature", "escalate this")
                answer = answer.replace("by calling", "by escalating")
                answer = answer.replace("or you can reach out", "or I can escalate")
                answer = answer.replace("or you can contact", "or I can escalate")
                answer = re.sub(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', '', answer)
                answer = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '', answer)
                repair_patterns = ["replace the", "tighten the", "screw the", "wire the", "repair the", "fix the", "install the", "disassemble", "take apart"]
                if any(pattern in answer.lower() for pattern in repair_patterns):
                    answer = """I can help you check a few things, but if repairs are needed, I'll need to escalate this to your landlord.

Can you check:
- Is the device plugged in and powered on?
- Are there any visible signs of damage?
- Is there an error message or indicator light?

If the issue persists after checking these, would you like me to escalate this to your landlord?"""
                sources = [chunk[:200] + "..." if len(chunk) > 200 else chunk for chunk in context_chunks[:3]]
                return answer.strip(), sources
            else:
                return self._answer_with_llm(question, "You couldn't find specific information about this property, but you can try to help using general knowledge.", conversation_history)
        except Exception as e:
            print(f"Error in RAG query: {e}")
            return self._answer_with_llm(question, "You couldn't find specific information about this property, but you can try to help using general knowledge.", conversation_history)
    
    def _answer_with_llm(self, question: str, situation: str, conversation_history: List[dict] = None) -> Tuple[str, List[str]]:
        if not self.llm:
            return self._escalation_message(), []
        history_text = self._format_history(conversation_history)
        prompt = f"""{MASTER_PROMPT}

=== CURRENT SITUATION ===
{situation}{history_text}
=== USER QUESTION ===
"{question}"

=== YOUR RESPONSE ===
Based on the master prompt guidelines above, try to answer using general knowledge about household appliances, property maintenance, or rental procedures. If you can provide a helpful general answer, do so briefly. If the question is too specific or you're not confident, politely say you don't have that information and ask "Would you like me to escalate this to your landlord?" NEVER tell users to contact the landlord directly or use app features - YOU are the app.{" Use the recent conversation context to understand what the user is referring to." if history_text else ""}

Your response:"""
        try:
            answer = self.llm.invoke(prompt)
            # Remove any references to contacting landlord directly or using app features
            answer = answer.replace("contact your landlord directly", "escalate this to your landlord")
            answer = answer.replace("contact the landlord", "escalate this to your landlord")
            answer = answer.replace("reach out directly", "escalate this")
            answer = answer.replace("using the chat feature", "escalate this")
            answer = answer.replace("by calling", "by escalating")
            answer = answer.replace("by calling (", "by escalating (")
            answer = answer.replace("or you can reach out", "or I can escalate")
            answer = answer.replace("or you can contact", "or I can escalate")
            answer = re.sub(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', '', answer)
            answer = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '', answer)
            # If no escalation offer and answer seems incomplete, add one
            if "landlord" not in answer.lower() and "escalate" not in answer.lower() and ("don't know" in answer.lower() or "not sure" in answer.lower() or "don't have" in answer.lower()):
                answer += "\n\nWould you like me to escalate this to your landlord?"
            return answer.strip(), []
        except Exception as e:
            print(f"Error in LLM answer: {e}")
            return self._escalation_message(), []
    
    def _generate_roast(self, question: str) -> Tuple[str, List[str]]:
        if not self.llm:
            return "macOS? I don't have much to say about that right now.", []
        style_examples = """Here are examples of the style of roasts to use:
- "macOS is here the same way a broken lamp is here — physically present, zero utility."
- "If laziness were a sport, macOS would still come in last."
- "He wants to climb K2? He can't even climb out of bed before noon."
- "Even the houseplants contribute more than macOS."
- "He's a placeholder the way a crash screen is a feature."
- "If effort were measured in bytes, macOS would be running on empty."
- "He's the only guy who could hold a ladder for K2 and still mess it up."
"""
        prompt = f"""Generate a humorous roast about macOS in the exact style of these examples:

{style_examples}

The roast should:
- Be witty and humorous
- Use creative comparisons and metaphors
- Be concise (1-2 sentences max)
- Playfully criticize macOS as unnecessary or ineffective
- Match the tone and style of the examples above

Question asked: "{question}"

Generate ONE roast in this style:"""
        try:
            return self.llm.invoke(prompt).strip(), []
        except Exception as e:
            print(f"Error generating roast: {e}")
            return "macOS? Yeah, that's a thing.", []
    
    def _escalation_message(self) -> str:
        return "I don't have specific information about that. Would you like me to escalate this to your landlord?"
    
    def general_conversation(self, message: str, user_role: str = "TENANT", conversation_history: List[dict] = None) -> str:
        if not self.llm:
            return "Hello! I'm here to help. How can I assist you today?"
        history_text = self._format_history(conversation_history)
        prompt = f"""{MASTER_PROMPT}

=== CURRENT SITUATION ===
The user has sent a general message (not a specific question about the property, and not reporting an issue). This could be a greeting, casual conversation, or general inquiry.{history_text}
=== USER MESSAGE ===
"{message}"

=== USER ROLE ===
{user_role}

=== YOUR RESPONSE ===
Respond naturally and conversationally. Be friendly, helpful, and brief. If it's a greeting, greet them back warmly. If they're just chatting, engage naturally. If they seem to need help but aren't being specific, gently ask how you can assist them. Keep it short (1-3 sentences max) and don't mention property manuals or technical details unless they ask. NEVER tell users to contact the landlord directly or use app features - YOU are the app.{" Use the recent conversation context to understand what the user is referring to." if history_text else ""}

Your response:"""
        try:
            response = self.llm.invoke(prompt).strip()
            # Remove any references to contacting landlord directly
            response = response.replace("contact your landlord directly", "escalate this to your landlord")
            response = response.replace("contact the landlord", "escalate this to your landlord")
            response = response.replace("reach out directly", "escalate this")
            response = response.replace("using the chat feature", "escalate this")
            response = response.replace("by calling", "by escalating")
            response = response.replace("or you can reach out", "or I can escalate")
            response = response.replace("or you can contact", "or I can escalate")
            response = re.sub(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', '', response)
            response = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '', response)
            return response
        except Exception as e:
            print(f"Error in general conversation: {e}")
            msg_lower = message.lower().strip()
            if any(g in msg_lower for g in ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"]):
                return "Hello! How can I help you today?"
            elif any(t in msg_lower for t in ["thank", "thanks", "appreciate"]):
                return "You're welcome! Is there anything else I can help with?"
            return "I'm here to help! What can I do for you today?"

    def triage_issue(self, description: str) -> dict:
        if not self.llm:
            return self._triage_fallback(description)
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
            json_match = re.search(r'\{[^}]+\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except Exception as e:
            print(f"Error in issue triage: {e}")
        return self._triage_fallback(description)
    
    def _triage_fallback(self, description: str) -> dict:
        desc_lower = description.lower()
        category = "OTHER"
        if any(w in desc_lower for w in ["ac", "air conditioning", "cooling"]):
            category = "AC"
        elif any(w in desc_lower for w in ["heat", "heater", "heating", "warm"]):
            category = "HEATER"
        elif any(w in desc_lower for w in ["light", "lamp", "bulb", "flicker"]):
            category = "LIGHTS"
        elif any(w in desc_lower for w in ["water", "leak", "pipe", "faucet", "toilet"]):
            category = "PLUMBING"
        elif any(w in desc_lower for w in ["wifi", "internet", "router", "network"]):
            category = "ROUTER"
        elif any(w in desc_lower for w in ["appliance", "oven", "washer", "dryer", "dishwasher"]):
            category = "APPLIANCES"
        severity = "medium"
        if any(w in desc_lower for w in ["urgent", "emergency", "broken", "not working", "won't"]):
            severity = "high"
        elif any(w in desc_lower for w in ["sometimes", "occasionally", "minor", "small"]):
            severity = "low"
        return {"category": category, "severity": severity, "suggested_actions": ["Schedule inspection", "Contact tenant for more details"], "confidence": 0.6}
    
    def suggest_reply(self, context: List[dict], tone: str = "professional") -> str:
        if not self.llm:
            return "Thank you for your message. I'll get back to you soon."
        context_text = "\n".join([f"{msg.get('role', 'user')}: {msg.get('content', '')}" for msg in context[-5:]])
        prompt = f"""You are a property manager assistant. Generate a {tone} reply based on this conversation:

{context_text}

Generate a brief, {tone} reply (2-3 sentences max). Be helpful and clear:"""
        try:
            return self.llm.invoke(prompt).strip()
        except Exception as e:
            print(f"Error generating reply suggestion: {e}")
            return "Thank you for your message. I'll get back to you soon."
    
    def is_ready(self) -> bool:
        return self.llm is not None and len(self.vector_stores) > 0
