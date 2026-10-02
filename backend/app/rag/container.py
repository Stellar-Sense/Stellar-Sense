"""共享 RetrievalService 实例，供 API 与小遇直接调用。"""

from pathlib import Path

from app.config import BASE_DIR, settings
from app.rag.service import RetrievalService


def configured_index_path() -> Path:
    """解析独立 BM25 索引路径，不复用 legacy RAG_INDEX_PATH。"""
    configured = settings.rag_retrieval_index_path.strip()
    path = Path(configured) if configured else Path("data/processed/rag_index.json")
    return path if path.is_absolute() else BASE_DIR / path


retrieval_service = RetrievalService(index_path=configured_index_path())
