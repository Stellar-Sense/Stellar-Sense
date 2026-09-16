"""将 TXT、Markdown、DOCX 和文本型 PDF 解析为统一 Document。"""

import hashlib
import io
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree

from app.rag.models import Document, DocumentSection, Metadata, NodeId

SUPPORTED_SUFFIXES = frozenset({".txt", ".md", ".docx", ".pdf"})
_WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
_NS = {"w": _WORD_NS}
_HEADING_STYLE = re.compile(r"^(heading\s*\d*|标题\s*\d*)$", re.IGNORECASE)
_PLAIN_HEADING = re.compile(r"^(?:第[0-9一二三四五六七八九十百]+[章节篇部]|\[[^\]]+\])")


class DocumentParseError(ValueError):
    """资料存在，但无法可靠解析。"""


class UnsupportedDocumentError(DocumentParseError):
    """资料类型或内容形态不在 V0.1 支持范围。"""


class DocumentParser:
    def parse(
        self,
        source_path: str | Path,
        *,
        node_id: NodeId | None = None,
        resource_id: str | None = None,
        metadata: Metadata | None = None,
    ) -> Document:
        path = Path(source_path).expanduser().resolve()
        if not path.exists():
            raise DocumentParseError(f"资料不存在：{path}")
        if not path.is_file():
            raise DocumentParseError(f"资料路径不是文件：{path}")

        suffix = path.suffix.lower()
        if suffix not in SUPPORTED_SUFFIXES:
            supported = ", ".join(sorted(SUPPORTED_SUFFIXES))
            raise UnsupportedDocumentError(
                f"不支持的资料类型 {suffix or '<无扩展名>'}；当前支持：{supported}"
            )

        try:
            raw = path.read_bytes()
        except OSError as exc:
            raise DocumentParseError(f"读取资料失败：{path}：{exc}") from exc

        resolved_resource_id = resource_id or self._resource_id(path.name, raw)
        document_metadata = dict(metadata or {})
        document_metadata.setdefault("source_suffix", suffix)

        if suffix in {".txt", ".md"}:
            text = self._decode_text(raw, path)
            sections = self._parse_text_sections(text, markdown=suffix == ".md")
            parser_name = "markdown" if suffix == ".md" else "text"
        elif suffix == ".docx":
            sections = self._parse_docx(raw, path)
            text = "\n\n".join(section.content for section in sections)
            parser_name = "docx"
        else:
            sections = self._parse_pdf(raw, path)
            text = "\n\n".join(section.content for section in sections)
            parser_name = "pypdf"

        if not text.strip():
            raise DocumentParseError(f"资料中没有可用文本：{path}")
        document_metadata.setdefault("parser", parser_name)
        return Document(
            resource_id=resolved_resource_id,
            resource_name=path.name,
            source_path=str(path),
            node_id=node_id,
            text=text.strip(),
            sections=sections,
            metadata=document_metadata,
        )

    @staticmethod
    def _resource_id(resource_name: str, raw: bytes) -> str:
        digest = hashlib.sha256()
        digest.update(resource_name.encode("utf-8"))
        digest.update(b"\0")
        digest.update(raw)
        return f"res_{digest.hexdigest()[:24]}"

    @staticmethod
    def _decode_text(raw: bytes, path: Path) -> str:
        errors: list[str] = []
        for encoding in ("utf-8-sig", "gb18030"):
            try:
                return raw.decode(encoding)
            except UnicodeDecodeError as exc:
                errors.append(f"{encoding}: {exc}")
        raise DocumentParseError(f"文本编码无法识别：{path}；{'；'.join(errors)}")

    def _parse_text_sections(self, text: str, *, markdown: bool) -> tuple[DocumentSection, ...]:
        sections: list[DocumentSection] = []
        heading = "正文"
        lines: list[str] = []

        def flush() -> None:
            content = "\n".join(lines).strip()
            if content:
                sections.append(DocumentSection(heading=heading, content=content))

        for line in text.splitlines():
            detected = self._text_heading(line, markdown=markdown)
            if detected is not None:
                flush()
                heading = detected
                lines = []
            else:
                lines.append(line)
        flush()
        if not sections and text.strip():
            sections.append(DocumentSection(heading="正文", content=text.strip()))
        return tuple(sections)

    @staticmethod
    def _text_heading(line: str, *, markdown: bool) -> str | None:
        stripped = line.strip()
        markdown_match = re.match(r"^#{1,6}\s+(.+?)\s*#*$", stripped)
        if markdown_match:
            return markdown_match.group(1).strip()
        if not markdown and len(stripped) <= 80 and _PLAIN_HEADING.match(stripped):
            return stripped.strip("[] ")
        return None

    @staticmethod
    def _parse_docx(raw: bytes, path: Path) -> tuple[DocumentSection, ...]:
        try:
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                xml = archive.read("word/document.xml")
        except (zipfile.BadZipFile, KeyError, OSError) as exc:
            raise DocumentParseError(f"DOCX 文件损坏或结构不完整：{path}：{exc}") from exc

        try:
            root = ElementTree.fromstring(xml)
        except ElementTree.ParseError as exc:
            raise DocumentParseError(f"DOCX XML 无法解析：{path}：{exc}") from exc

        sections: list[DocumentSection] = []
        heading = "正文"
        paragraphs: list[str] = []

        def flush() -> None:
            content = "\n".join(paragraphs).strip()
            if content:
                sections.append(DocumentSection(heading=heading, content=content))

        for paragraph in root.findall(".//w:body/w:p", _NS):
            text = "".join(node.text or "" for node in paragraph.findall(".//w:t", _NS)).strip()
            if not text:
                continue
            style_node = paragraph.find("./w:pPr/w:pStyle", _NS)
            style = style_node.get(f"{{{_WORD_NS}}}val", "") if style_node is not None else ""
            if _HEADING_STYLE.match(style):
                flush()
                heading = text
                paragraphs = []
            else:
                paragraphs.append(text)
        flush()
        if not sections:
            raise DocumentParseError(f"DOCX 中没有可用文本：{path}")
        return tuple(sections)

    @staticmethod
    def _parse_pdf(raw: bytes, path: Path) -> tuple[DocumentSection, ...]:
        try:
            from pypdf import PdfReader
        except ImportError as exc:  # pragma: no cover - 依赖缺失只会出现在不完整部署中
            raise DocumentParseError("解析 PDF 需要安装项目依赖 pypdf") from exc

        try:
            reader = PdfReader(io.BytesIO(raw))
            if reader.is_encrypted and reader.decrypt("") == 0:
                raise UnsupportedDocumentError(f"不支持需要密码的 PDF：{path}")
            sections = tuple(
                DocumentSection(heading=f"第 {index} 页", content=text.strip())
                for index, page in enumerate(reader.pages, start=1)
                if (text := (page.extract_text() or "")).strip()
            )
        except UnsupportedDocumentError:
            raise
        except Exception as exc:
            raise DocumentParseError(f"PDF 解析失败：{path}：{exc}") from exc

        if not sections:
            raise UnsupportedDocumentError(f"PDF 未提取到文本，可能是扫描版；RAG V0.1 不支持 OCR：{path}")
        return sections
