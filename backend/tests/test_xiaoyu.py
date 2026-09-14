import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app.services.xiaoyu import CompanionService, SummaryRetriever, NODE_SECTIONS
from app.config import BASE_DIR


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


class BundledIndexTests(unittest.TestCase):
    def test_default_index_covers_mapped_nodes(self):
        with patch("app.services.xiaoyu.settings", SimpleNamespace(rag_index_path="")):
            for node in NODE_SECTIONS:
                with self.subTest(node=node):
                    self.assertTrue(SummaryRetriever().retrieve("解释这个知识点", node))
            self.assertEqual(SummaryRetriever().retrieve("问题", "图像增强"), [])

    def test_relative_override_resolves_from_backend(self):
        with patch("app.services.xiaoyu.settings", SimpleNamespace(rag_index_path="data/knowledge.json")):
            chunks = SummaryRetriever().retrieve("辐射定标", "辐射校正")
        self.assertTrue(chunks)
        self.assertTrue(all(c["evidenceKind"] == "summary" for c in chunks))

    def test_bundled_index_integrity(self):
        data = json.loads((BASE_DIR / "data/knowledge.json").read_text())
        self.assertEqual(len(data["nodes"]), 579)
        self.assertEqual(len({r["node_id"] for r in data["nodes"]}), 579)
        for row in data["nodes"]:
            for field in ("node_id", "node_name", "text", "source_document", "source_locator", "original_resource_hint"):
                self.assertIn(field, row)


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
