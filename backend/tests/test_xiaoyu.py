import json
import unittest
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from app.services.xiaoyu import CompanionService, SummaryRetriever


class Retriever:
    def retrieve(self, question, node_id):
        return [{"chunkId": "KP_test", "text": "测试摘要", "evidenceKind": "summary"}]


class EmptyRetriever:
    def retrieve(self, question, node_id):
        return []


class Generator:
    def __init__(self, ids):
        self.ids = ids

    async def generate(self, messages):
        return json.dumps({"answer": "测试回答", "cited_chunk_ids": self.ids,
                           "suggested_action": "测试建议"})


class LocalIndexTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.path = self.base / "data/knowledge.json"
        self.path.parent.mkdir()
        self.path.write_text(json.dumps({"nodes": [{"node_id": "5.1.1", "node_name": "测试节点",
            "text": "测试摘要", "source_document": "测试文档", "source_locator": "测试位置",
            "original_resource_hint": "测试线索"}]}))
        self.base_patch = patch("app.services.xiaoyu.BASE_DIR", self.base)
        self.base_patch.start()
        self.addCleanup(self.base_patch.stop)

    def test_default_index(self):
        with patch("app.services.xiaoyu.settings", SimpleNamespace(rag_index_path="")):
            self.assertTrue(SummaryRetriever().retrieve("问题", "辐射校正"))
            self.assertEqual(SummaryRetriever().retrieve("问题", "图像增强"), [])

    def test_relative_override(self):
        with patch("app.services.xiaoyu.settings", SimpleNamespace(rag_index_path="data/knowledge.json")):
            self.assertTrue(SummaryRetriever().retrieve("问题", "辐射校正"))

    def test_missing_file_returns_no_materials(self):
        with patch("app.services.xiaoyu.settings", SimpleNamespace(rag_index_path="missing.json")):
            self.assertEqual(SummaryRetriever().retrieve("问题", "辐射校正"), [])

    def test_corrupt_file_is_not_silently_ignored(self):
        self.path.write_text("invalid json")
        with patch("app.services.xiaoyu.settings", SimpleNamespace(rag_index_path="")):
            with self.assertRaises(ValueError):
                SummaryRetriever().retrieve("问题", "辐射校正")


class CompanionTests(unittest.IsolatedAsyncioTestCase):
    async def test_citations_and_canonical_context(self):
        with patch("app.services.xiaoyu.settings", SimpleNamespace(llm_enabled=True)):
            result = await CompanionService(Retriever(), Generator(["KP_test"])).reply(
                "这个是什么", SimpleNamespace(id="辐射校正", title="辐射校正", summary="摘要"),
                {"node": "伪造名称"}, [])
        self.assertEqual(result["metadata"]["context"]["node"], "辐射校正")
        self.assertEqual(result["metadata"]["references"][0]["chunkId"], "KP_test")
        self.assertEqual(result["metadata"]["mode"], "generated")

    async def test_unknown_citation_rejected(self):
        with patch("app.services.xiaoyu.settings", SimpleNamespace(llm_enabled=True)):
            result = await CompanionService(Retriever(), Generator(["invented"])).reply("问题", None, {}, [])
        self.assertEqual(result["metadata"]["mode"], "fallback")
        self.assertEqual(result["metadata"]["references"], [])

    async def test_no_materials_generates_without_sources(self):
        with patch("app.services.xiaoyu.settings", SimpleNamespace(llm_enabled=True)):
            result = await CompanionService(EmptyRetriever(), Generator([])).reply("图像增强是什么", None, {}, [])
        self.assertEqual(result["metadata"]["mode"], "model_only")
        self.assertEqual(result["metadata"]["references"], [])

    async def test_no_materials_rejects_fabricated_source(self):
        with patch("app.services.xiaoyu.settings", SimpleNamespace(llm_enabled=True)):
            result = await CompanionService(EmptyRetriever(), Generator(["invented"])).reply("问题", None, {}, [])
        self.assertEqual(result["metadata"]["mode"], "fallback")

    async def test_locked_key_is_explicit(self):
        with patch("app.services.xiaoyu.settings", SimpleNamespace(llm_enabled=False)):
            result = await CompanionService(Retriever(), Generator([])).reply("问题", None, {}, [])
        self.assertEqual(result["metadata"]["reason"], "模型密钥尚未配置")


if __name__ == "__main__":
    unittest.main()
