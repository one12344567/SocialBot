from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from langchain.tools import tool
from langchain.agents import create_agent
from langchain_deepseek import ChatDeepSeek
from dotenv import load_dotenv
import os
from langgraph.checkpoint.memory import InMemorySaver


load_dotenv()
DEEPSEEK_API_KEY=os.getenv("DEEPSEEK_API_KEY")

llm_deepseek = ChatDeepSeek(
    model="deepseek-chat",
    api_key=DEEPSEEK_API_KEY,
)

embeddings = OllamaEmbeddings(model="embeddinggemma")
vector_store = Chroma(
    collection_name="my_collection",
    embedding_function=embeddings,
    persist_directory="/Users/yc/projects/social bot/chroma_db",
)

@tool
def search_knowledge_base(query: str) -> str:
    """Search the knowledge base for the query."""
    print(f"\nagent查询了向量库，query={query}\n")
    results=vector_store.similarity_search(query,k=3)
    return f"查询结果：{results}"


if __name__ == "__main__":
    ag=create_agent(
        model=llm_deepseek,
        tools=[search_knowledge_base],
        middleware=[],
        checkpointer=InMemorySaver(),
    )
    while True:
        query=input("请输入：")
        if query=="exit":
            break
        resp=ag.invoke({"messages":[{"role":"user","content":query}]},
                  config={"configurable": {"thread_id": "cli-demo"}})
        print(resp)