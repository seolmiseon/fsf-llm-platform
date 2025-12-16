from langchain_openai import OpenAI
from langchain.chains import RetrievalQA
try:
    from langchain_chroma import Chroma
except ImportError:
    # Fallback to deprecated import if langchain-chroma not installed
    from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings


class RAGService:
    def __init__(self, persist_directory: str = "chroma_db"):
        self.embeddings = OpenAIEmbeddings()
        self.vector_store = Chroma(
            persist_directory=persist_directory, embedding_function=self.embeddings
        )
        self.llm = OpenAI(model="gpt-4o-mini")
        self.qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm, chain_type="stuff", retriever=self.vector_store.as_retriever()
        )

    def query(self, question: str) -> str:
        return self.qa_chain.run(question)

    def search(self, collection_name: str, query: str, top_k: int = 5):
        # collection_name은 무시하고 기본 vector_store 사용
        # (LangChain Chroma는 단일 collection만 지원)
        retriever = self.vector_store.as_retriever(search_kwargs={"k": top_k})
        docs = retriever.get_relevant_documents(query)
        ...

        return {
            "ids": [doc.metadata.get("id", f"doc_{i}") for i, doc in enumerate(docs)],
            "documents": [doc.page_content for doc in docs],
            "metadatas": [doc.metadata for doc in docs],
            "distances": [0.5] * len(docs),
        }

    def add_documents(
        self,
        collection_name: str,
        documents: list,
        metadatas: list = None,
        ids: list = None,
    ):
        """ChromaDB에 문서 추가 (캐싱용)"""
        if metadatas is None:
            metadatas = [{}] * len(documents)

        if ids is None:
            import hashlib

            ids = [hashlib.md5(doc.encode()).hexdigest() for doc in documents]

        # metadata에 ID 추가! (추가된 부분)
        for i, metadata in enumerate(metadatas):
            metadata["id"] = ids[i]

        self.vector_store.add_texts(texts=documents, metadatas=metadatas, ids=ids)
