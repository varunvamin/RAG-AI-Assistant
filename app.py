"""
app.py — RAG-Powered Study Assistant

A premium Streamlit application that lets you upload PDF textbooks,
ask questions about them using RAG, and generate Anki flashcards.
"""

import os
import time
import streamlit as st
from dotenv import load_dotenv

from rag_pipeline import process_pdf, create_rag_chain, ask_question
from flashcard_generator import generate_flashcards, export_to_csv, get_flashcard_stats


# Load environment variables from .env file (local dev)
load_dotenv()

# ---------------------------------------------------------------------------
# Page Configuration
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="RAG Study Assistant",
    page_icon="📚",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------------------------
# Custom CSS for Premium Look
# ---------------------------------------------------------------------------
st.markdown(
    """
    <style>
    /* ---- Import Google Font ---- */
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

    /* ---- Global Styles ---- */
    html, body, [class*="st-"] {
        font-family: 'Outfit', sans-serif;
    }

    /* ---- Hide Sidebar & Streamlit Elements ---- */
    [data-testid="stSidebar"] {
        display: none;
    }
    #MainMenu, footer, header {
        visibility: hidden;
    }

    /* ---- Main Background ---- */
    .stApp {
        background: #0F172A;
        background-image: radial-gradient(circle at 50% 50%, #1E293B 0%, #0F172A 100%);
    }

    /* ---- Floating Action Button (FAB) ---- */
    .floating-bot-container {
        position: fixed;
        bottom: 30px;
        right: 30px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }

    .bot-bubble {
        width: 70px;
        height: 70px;
        background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 30px rgba(124, 58, 237, 0.4);
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        border: 2px solid rgba(255, 255, 255, 0.2);
    }

    .bot-bubble:hover {
        transform: scale(1.1) rotate(5deg);
        box-shadow: 0 15px 40px rgba(124, 58, 237, 0.6);
    }

    /* ---- Floating Chat Window ---- */
    .chat-window {
        width: 400px;
        height: 600px;
        background: rgba(30, 41, 59, 0.8);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        margin-bottom: 20px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        animation: slideUp 0.4s ease-out;
        overflow: hidden;
    }

    @keyframes slideUp {
        from { transform: translateY(50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }

    /* ---- Custom Top Bar for Controls ---- */
    .top-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 30px;
        background: rgba(30, 41, 59, 0.4);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        position: sticky;
        top: 0;
        z-index: 999;
    }

    /* ---- Content Cards ---- */
    .content-card {
        background: rgba(30, 41, 59, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 20px;
    }

    .pulse {
        animation: pulse-animation 2s infinite;
    }

    @keyframes pulse-animation {
        0% { box-shadow: 0 0 0 0px rgba(124, 58, 237, 0.4); }
        100% { box-shadow: 0 0 0 20px rgba(124, 58, 237, 0); }
    }
    </style>
    """,
    unsafe_allow_html=True,
)


# ---------------------------------------------------------------------------
# Session State Initialization
# ---------------------------------------------------------------------------
def init_session_state():
    """Initialize all session state variables."""
    defaults = {
        "vector_store": None,
        "chunks": None,
        "page_count": 0,
        "rag_chain": None,
        "chat_history": [],
        "pdf_name": None,
        "flashcards": None,
        "processing": False,
        "show_bot": False,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


init_session_state()


# ---------------------------------------------------------------------------
# Sidebar
# ---------------------------------------------------------------------------
def render_header_controls():
    """Render top bar controls for API key and PDF upload."""
    st.markdown("""
        <div style='display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem;'>
            <h2 style='margin:0; color:#7C3AED;'>📚 StudySpace</h2>
            <div id='header-status'></div>
        </div>
    """, unsafe_allow_html=True)
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        api_key = st.text_input(
            "Groq API Key",
            type="password",
            value=os.getenv("GROQ_API_KEY", ""),
            placeholder="gsk_...",
            label_visibility="collapsed"
        )
        if not api_key:
            st.warning("Enter Groq API Key to start")
            
    with col2:
        uploaded_file = st.file_uploader(
            "Upload PDF",
            type=["pdf"],
            label_visibility="collapsed"
        )
        
    if uploaded_file is not None and uploaded_file.name != st.session_state.pdf_name:
        if api_key:
            process_uploaded_pdf(uploaded_file, api_key)
        else:
            st.error("API Key required first")
            
    return api_key



# ---------------------------------------------------------------------------
# PDF Processing
# ---------------------------------------------------------------------------
def process_uploaded_pdf(uploaded_file, api_key: str):
    """Process an uploaded PDF file through the RAG pipeline."""
    st.session_state.processing = True

    with st.sidebar:
        with st.spinner("Processing your PDF..."):
            progress = st.progress(0, text="Extracting text...")
            try:
                # Step 1: Extract + Chunk + Embed
                progress.progress(10, text="Extracting text from PDF...")
                time.sleep(0.3)  # Small delay for visual feedback

                progress.progress(30, text="Chunking text...")
                vector_store, chunks, page_count = process_pdf(uploaded_file.read())

                progress.progress(70, text="Creating embeddings & index...")
                time.sleep(0.3)

                # Step 2: Create RAG chain
                progress.progress(85, text="Setting up RAG chain...")
                chain = create_rag_chain(vector_store, api_key)

                # Step 3: Store in session state
                st.session_state.vector_store = vector_store
                st.session_state.chunks = chunks
                st.session_state.page_count = page_count
                st.session_state.rag_chain = chain
                st.session_state.pdf_name = uploaded_file.name
                st.session_state.chat_history = []
                st.session_state.flashcards = None

                progress.progress(100, text="✅ Done!")
                time.sleep(0.5)
                progress.empty()

                st.success(f"Processed **{page_count}** pages → **{len(chunks)}** chunks")

            except ValueError as e:
                progress.empty()
                st.error(str(e))
            except Exception as e:
                progress.empty()
                st.error(f"Error processing PDF: {str(e)}")

    st.session_state.processing = False


# ---------------------------------------------------------------------------
# Main Chat Area
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Main Chat Area (Floating Bot)
# ---------------------------------------------------------------------------
def render_floating_bot(api_key: str):
    """Render the floating bot and its chat window."""
    
    # 1. Floating Container Logic
    st.markdown("""
        <div class="floating-bot-container">
    """, unsafe_allow_html=True)
    
    # Toggle button for the bot (Floating Action Button)
    if st.button("🤖", key="bot_fab", help="Chat with Assistant"):
        st.session_state.show_bot = not st.session_state.show_bot
        st.rerun()

    if st.session_state.show_bot:
        with st.container():
            st.markdown('<div class="chat-window">', unsafe_allow_html=True)
            
            # Header of the chat window
            st.markdown("""
                <div style='background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%); padding: 15px; color: white; display: flex; align-items: center; gap: 10px;'>
                    <span style='font-size: 1.5rem;'>🤖</span>
                    <div>
                        <div style='font-weight: 700; font-size: 0.9rem;'>StudyBot</div>
                        <div style='font-size: 0.7rem; opacity: 0.8;'>Always here to help</div>
                    </div>
                </div>
            """, unsafe_allow_html=True)

            # Chat History Area (Scrollable)
            chat_container = st.container(height=450, border=False)
            with chat_container:
                if not st.session_state.chat_history:
                    st.info("👋 Hello! Upload a PDF and I can help you study it.")
                
                for message in st.session_state.chat_history:
                    with st.chat_message(message["role"], avatar="🧑‍🎓" if message["role"] == "user" else "🤖"):
                        st.markdown(message["content"])

            # Chat Input inside the window
            if prompt := st.chat_input("Ask me anything...", key="floating_input"):
                if not api_key:
                    st.error("Missing API Key")
                elif not st.session_state.rag_chain:
                    st.error("Upload a PDF first")
                else:
                    st.session_state.chat_history.append({"role": "user", "content": prompt})
                    with chat_container:
                        with st.chat_message("user", avatar="🧑‍🎓"):
                            st.markdown(prompt)
                        
                        with st.chat_message("assistant", avatar="🤖"):
                            with st.spinner(""):
                                answer, _ = ask_question(st.session_state.rag_chain, prompt, st.session_state.chat_history)
                                st.markdown(answer)
                                st.session_state.chat_history.append({"role": "assistant", "content": answer})
                    st.rerun()

            st.markdown('</div>', unsafe_allow_html=True)
            
    st.markdown("</div>", unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Main Study Area
# ---------------------------------------------------------------------------
def render_study_workspace():
    """Render the main study space when no PDF is uploaded."""
    if st.session_state.pdf_name is None:
        st.markdown("""
            <div style='text-align: center; padding: 100px 0;'>
                <h1 style='font-size: 3rem; background: linear-gradient(135deg, #7C3AED, #4F46E5); -webkit-background-clip: text; -webkit-text-fill-color: transparent;'>Ready to Study?</h1>
                <p style='color: #94A3B8; font-size: 1.2rem;'>Upload your textbook above to unlock your personal floating assistant.</p>
                <div style='display: flex; justify-content: center; gap: 20px; margin-top: 40px;'>
                    <div class="content-card" style='width: 250px;'>
                        <div style='font-size: 2rem;'>📚</div>
                        <h4 style='color: #E2E8F0;'>Step 1</h4>
                        <p style='font-size: 0.8rem; color: #94A3B8;'>Paste your Groq API Key at the top.</p>
                    </div>
                    <div class="content-card" style='width: 250px;'>
                        <div style='font-size: 2rem;'>📄</div>
                        <h4 style='color: #E2E8F0;'>Step 2</h4>
                        <p style='font-size: 0.8rem; color: #94A3B8;'>Upload any PDF textbook or notes.</p>
                    </div>
                    <div class="content-card" style='width: 250px;'>
                        <div style='font-size: 2rem;'>🤖</div>
                        <h4 style='color: #E2E8F0;'>Step 3</h4>
                        <h4 style='color: #E2E8F0;'>Step 3</h4>
                        <p style='font-size: 0.8rem; color: #94A3B8;'>Click the floating bot to start chatting.</p>
                    </div>
                </div>
            </div>
        """, unsafe_allow_html=True)
    else:
        st.success(f"📖 Now Studying: **{st.session_state.pdf_name}**")
        
        # Display Stats
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Pages", st.session_state.page_count)
        with col2:
            st.metric("Sections Analyzed", len(st.session_state.chunks))
        with col3:
            if st.button("🗑️ Reset Workspace", use_container_width=True):
                for key in ["vector_store", "chunks", "page_count", "rag_chain", "chat_history", "pdf_name", "flashcards"]:
                    st.session_state[key] = None if key != "page_count" else 0
                st.rerun()

        # Flashcard Tab in Workspace
        with st.expander("📝 Generate Study Flashcards", expanded=False):
            if st.button("🚀 Generate Anki Cards", use_container_width=True):
                with st.spinner("Creating cards..."):
                    from flashcard_generator import generate_flashcards, export_to_csv
                    flashcards = generate_flashcards(st.session_state.chunks, st.session_state.api_key)
                    st.session_state.flashcards = flashcards
            
            if st.session_state.flashcards:
                st.download_button("⬇️ Download for Anki", data=export_to_csv(st.session_state.flashcards), file_name="flashcards.csv", mime="text/csv")

# ---------------------------------------------------------------------------
# Main Entry Point
# ---------------------------------------------------------------------------
def main():
    api_key = render_header_controls()
    st.session_state.api_key = api_key
    
    # Workspace (Main Area)
    render_study_workspace()
    
    # Floating Bot Overlay
    render_floating_bot(api_key)

if __name__ == "__main__":
    main()

