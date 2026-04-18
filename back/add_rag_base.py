#加载文档，切分，初始化embedding模型，初始化向量数据库，文档存入向量数据库，查询
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma

#使用方法：在下方输入pdf文件路径和embedding模型名称，运行即可
#注意，本项目优先使用ollama的embedding模型，如果未安装ollama，会报错
pdf_file="/Users/yc/projects/social bot/back/民法典.pdf"
embedding_model="embeddinggemma"


loader=PyPDFLoader(pdf_file)
docs=loader.load()
print("docs loaded\n")
text_splitter=RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=100,
    add_start_index=True,
)

all_splits=text_splitter.split_documents(docs)
print("text split\n")
embedding_model=OllamaEmbeddings(model=embedding_model)
print("embedding model loaded\n")

#vector_store=InMemoryVectorStore(embedding_model)
#vector_store.add_documents(all_splits)

vector_store=Chroma(
    collection_name="my_collection",
    embedding_function=embedding_model,
    persist_directory="./chroma_db",
)

vector_store.add_documents(all_splits)
print("added\n")


#检索demo
'''

while(True):
    query=input("请输入查询内容：")
    if query=="exit":
        break
    results=vector_store.similarity_search(query)

    for doc in results:
        print(doc.page_content)
        print("\n-----------------\n")
        print(doc.metadata)
        print("\n-----------------\n")
'''