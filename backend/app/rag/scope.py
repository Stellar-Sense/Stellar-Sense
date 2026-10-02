"""网页学习节点到 RAG 索引范围的集中映射。"""

from dataclasses import dataclass

# 当前 LearningNode.id 与索引 node_id 约定使用同一中文业务名。
# 仅在确有历史/资料命名差异时在此集中登记，禁止在调用方散落判断。
NODE_ID_ALIASES: dict[str, str] = {
    "影像增强": "图像增强",
    "遥感影像增强": "图像增强",
    "影像配准": "遥感影像配准",
}


@dataclass(frozen=True, slots=True)
class NodeRetrievalScope:
    requested_node_id: str | int | None
    index_node_id: str | int | None
    mapping: str

    @classmethod
    def resolve(cls, node_id: str | int | None) -> "NodeRetrievalScope":
        """无节点时返回全课程范围；有节点时执行 identity/alias 映射。"""
        if node_id is None or str(node_id).strip() == "":
            return cls(requested_node_id=None, index_node_id=None, mapping="all_course")
        normalized = str(node_id).strip()
        mapped = NODE_ID_ALIASES.get(normalized, normalized)
        return cls(
            requested_node_id=node_id,
            index_node_id=mapped,
            mapping="alias" if mapped != normalized else "direct",
        )
