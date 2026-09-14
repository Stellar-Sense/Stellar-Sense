"""校验上传图片并生成去除元数据的静态头像。"""

from io import BytesIO

from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_AVATAR_BYTES = 2 * 1024 * 1024
MAX_AVATAR_PIXELS = 16_000_000


def normalize_avatar(content: bytes) -> bytes:
    try:
        with Image.open(BytesIO(content)) as source:
            if source.format not in {"JPEG", "PNG", "WEBP"}:
                raise HTTPException(status_code=415, detail="请选择 PNG、JPG 或 WebP 图片")
            if source.width * source.height > MAX_AVATAR_PIXELS:
                raise HTTPException(status_code=422, detail="图片分辨率过大，请缩小到 1600 万像素以内")
            source.load()
            oriented = ImageOps.exif_transpose(source)
            avatar = ImageOps.fit(oriented.convert("RGBA"), (256, 256), Image.Resampling.LANCZOS)
            avatar.info.clear()
            output = BytesIO()
            avatar.save(output, format="PNG")
            return output.getvalue()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(
            status_code=422, detail="无法读取图片，请选择有效的 PNG、JPG 或 WebP 图片"
        ) from exc
