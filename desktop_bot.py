import tkinter as tk
import customtkinter as ctk
from tkinter import filedialog
import os
import threading
from PIL import Image
from dotenv import load_dotenv

# Import our existing RAG logic
from rag_pipeline import process_pdf, create_rag_chain, ask_question

load_dotenv()

class FloatingStudyBot(ctk.CTk):
    def __init__(self):
        super().__init__()

        # --- Window Configuration ---
        self.title("StudyBot AI")
        self.geometry("380x650+1000+100") # Positioned on the right side
        self.attributes('-topmost', True)  # Always on top
        # self.overrideredirect(True)      # Uncomment for frameless (harder to move)
        
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")

        # --- State Variables ---
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self.vector_store = None
        self.rag_chain = None
        self.chat_history = []
        self.is_processing = False

        self.setup_ui()

    def setup_ui(self):
        # --- Header ---
        self.header = ctk.CTkFrame(self, height=60, corner_radius=0, fg_color="#1E293B")
        self.header.pack(fill="x", side="top")
        
        self.title_label = ctk.CTkLabel(self.header, text="🤖 StudyBot AI", font=("Outfit", 18, "bold"), text_color="#A78BFA")
        self.title_label.pack(pady=10, padx=20, side="left")

        # --- Settings / Upload Area ---
        self.control_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.control_frame.pack(fill="x", padx=15, pady=10)

        self.upload_btn = ctk.CTkButton(self.control_frame, text="📄 Upload PDF", command=self.upload_pdf, 
                                       fg_color="#7C3AED", hover_color="#4F46E5", font=("Outfit", 12, "bold"))
        self.upload_btn.pack(fill="x", pady=5)

        self.status_label = ctk.CTkLabel(self.control_frame, text="Ready. Upload a PDF to start.", font=("Outfit", 10), text_color="#94A3B8")
        self.status_label.pack()

        # --- Chat Display ---
        self.chat_area = ctk.CTkTextbox(self, state="disabled", fg_color="#0F172A", border_color="#1E293B", 
                                       border_width=1, corner_radius=15, font=("Outfit", 13))
        self.chat_area.pack(expand=True, fill="both", padx=15, pady=10)

        # --- Input Area ---
        self.input_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.input_frame.pack(fill="x", side="bottom", padx=15, pady=15)

        self.user_input = ctk.CTkEntry(self.input_frame, placeholder_text="Ask me anything...", 
                                      height=45, corner_radius=20, fg_color="#1E293B", border_color="#334155")
        self.user_input.pack(fill="x", side="left", expand=True, padx=(0, 10))
        self.user_input.bind("<Return>", lambda e: self.send_message())

        self.send_btn = ctk.CTkButton(self.input_frame, text="➜", width=45, height=45, corner_radius=22,
                                     command=self.send_message, fg_color="#7C3AED", hover_color="#4F46E5")
        self.send_btn.pack(side="right")

    def log(self, message, role="bot"):
        self.chat_area.configure(state="normal")
        if role == "user":
            self.chat_area.insert("end", f"👤 You:\n{message}\n\n")
        else:
            self.chat_area.insert("end", f"🤖 Bot:\n{message}\n\n")
        self.chat_area.configure(state="disabled")
        self.chat_area.see("end")

    def upload_pdf(self):
        file_path = filedialog.askopenfilename(filetypes=[("PDF files", "*.pdf")])
        if file_path:
            self.status_label.configure(text=f"Processing: {os.path.basename(file_path)}...", text_color="#FBBF24")
            self.upload_btn.configure(state="disabled")
            
            # Run processing in a background thread to keep UI responsive
            thread = threading.Thread(target=self.process_pdf_thread, args=(file_path,))
            thread.start()

    def process_pdf_thread(self, file_path):
        try:
            with open(file_path, "rb") as f:
                pdf_bytes = f.read()
            
            vector_store, chunks, page_count = process_pdf(pdf_bytes)
            self.rag_chain = create_rag_chain(vector_store, self.api_key)
            
            self.after(0, lambda: self.on_processing_complete(len(chunks), page_count, os.path.basename(file_path)))
        except Exception as e:
            self.after(0, lambda: self.status_label.configure(text=f"Error: {str(e)[:30]}...", text_color="#EF4444"))
            self.after(0, lambda: self.upload_btn.configure(state="normal"))

    def on_processing_complete(self, chunks_count, page_count, filename):
        self.status_label.configure(text=f"📖 Loaded: {filename} ({page_count} pgs)", text_color="#4ADE80")
        self.upload_btn.configure(state="normal")
        self.log(f"I've analyzed '{filename}'. I'm ready for your questions!")

    def send_message(self):
        query = self.user_input.get().strip()
        if not query or self.is_processing:
            return
        
        if not self.rag_chain:
            self.log("Please upload a PDF first!")
            return

        self.user_input.delete(0, 'end')
        self.log(query, role="user")
        
        self.is_processing = True
        thread = threading.Thread(target=self.get_ai_response, args=(query,))
        thread.start()

    def get_ai_response(self, query):
        try:
            answer, sources = ask_question(self.rag_chain, query, self.chat_history)
            self.chat_history.append({"role": "user", "content": query})
            self.chat_history.append({"role": "assistant", "content": answer})
            
            self.after(0, lambda: self.log(answer))
        except Exception as e:
            self.after(0, lambda: self.log(f"Sorry, I ran into an error: {str(e)}"))
        finally:
            self.is_processing = False

if __name__ == "__main__":
    app = FloatingStudyBot()
    app.mainloop()
