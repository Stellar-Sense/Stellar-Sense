"""显式构建本地 RAG 索引：python -m app.rag.build_index ..."""

import argparse
import json
from pathlib import Path
from typing import Any

from app.rag.container import configured_index_path
from app.rag.models import ResourceInput
from app.rag.parser import SUPPORTED_SUFFIXES
from app.rag.service import RetrievalService


def _resource(
    path: Path, *, node_id: str | None = None, metadata: dict[str, Any] | None = None
) -> ResourceInput:
    return ResourceInput(
        source_path=str(path),
        node_id=node_id,
        metadata=dict(metadata or {}),
    )


def resources_from_sources(sources: list[Path], *, node_id: str | None) -> list[ResourceInput]:
    resources: list[ResourceInput] = []
    for source in sources:
        resolved = source.expanduser().resolve()
        if resolved.is_dir():
            files = sorted(
                path
                for path in resolved.rglob("*")
                if path.is_file() and path.suffix.lower() in SUPPORTED_SUFFIXES
            )
            resources.extend(_resource(path, node_id=node_id) for path in files)
        else:
            resources.append(_resource(resolved, node_id=node_id))
    return resources


def resources_from_manifest(manifest_path: Path) -> list[ResourceInput]:
    manifest = manifest_path.expanduser().resolve()
    payload = json.loads(manifest.read_text(encoding="utf-8"))
    rows = payload.get("resources") if isinstance(payload, dict) else payload
    if not isinstance(rows, list):
        raise ValueError("manifest 必须是资源数组，或包含 resources 数组")
    resources: list[ResourceInput] = []
    for row in rows:
        if not isinstance(row, dict) or not row.get("sourcePath"):
            raise ValueError("每项资源必须包含 sourcePath")
        source = Path(str(row["sourcePath"]))
        if not source.is_absolute():
            source = manifest.parent / source
        resources.append(
            ResourceInput(
                source_path=str(source.resolve()),
                node_id=row.get("nodeId"),
                resource_id=row.get("resourceId"),
                metadata=dict(row.get("metadata") or {}),
            )
        )
    return resources


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="构建遥感通 BM25 RAG 索引")
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--source", action="append", type=Path, help="资料文件或目录，可重复")
    source_group.add_argument("--manifest", type=Path, help="带 nodeId 的 JSON 资源清单")
    parser.add_argument("--node-id", help="为 --source 中全部资料指定节点；省略则为全课程资料")
    parser.add_argument("--output", type=Path, default=configured_index_path(), help="索引输出路径")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    resources = (
        resources_from_manifest(args.manifest)
        if args.manifest
        else resources_from_sources(args.source or [], node_id=args.node_id)
    )
    if not resources:
        raise SystemExit("未找到可索引的 TXT / Markdown / DOCX / PDF 文件")
    service = RetrievalService(index_path=args.output)
    chunks = service.rebuild(resources)
    print(f"已构建 {len(chunks)} 个 chunks：{Path(args.output).resolve()}")


if __name__ == "__main__":
    main()
