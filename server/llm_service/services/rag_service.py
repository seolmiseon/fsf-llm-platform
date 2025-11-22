from langchain_openai import OpenAI
from langchain.chains import RetrievalQA
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

class RAGService:
    def __init__(self, persist_directory: str = "chroma_db"):
        self.embeddings = OpenAIEmbeddings()
        self.vector_store = Chroma(persist_directory=persist_directory, embedding_function=self.embeddings)
        self.llm = OpenAI(model="gpt-4o-mini")
        self.qa_chain = RetrievalQA.from_chain_type(llm=self.llm, chain_type="stuff", retriever=self.vector_store.as_retriever())
    
    def query(self, question: str) -> str:
        return self.qa_chain.run(question)
    
    def search(self, collection_name: str, query: str, top_k: int = 5):
        """ChromaDB에서 유사 문서 검색"""
        retriever = self.vector_store.as_retriever(search_kwargs={"k": top_k})
        docs = retriever.get_relevant_documents(query)
        
        return {
            "ids": [f"doc_{i}" for i in range(len(docs))],
            "documents": [doc.page_content for doc in docs],
            "metadatas": [doc.metadata for doc in docs],
            "distances": [0.5] * len(docs)
        }