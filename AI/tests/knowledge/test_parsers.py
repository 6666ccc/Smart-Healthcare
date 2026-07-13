from io import BytesIO

import pytest

from wenrun_ai.knowledge.parsers import KnowledgeDocumentError, parse_document
from wenrun_ai.knowledge.types import KnowledgeBase


def test_knowledge_base_maps_to_isolated_collections():
    assert KnowledgeBase.from_value("medical-general").collection_name == "wenrun_medical_general"
    assert KnowledgeBase.from_value("hospital-custom").collection_name == "wenrun_hospital_custom"

    with pytest.raises(KnowledgeDocumentError):
        KnowledgeBase.from_value("other")


def test_parses_utf8_text_and_markdown():
    text = parse_document("高血压科普".encode(), "guide.txt")
    markdown = parse_document("# 一楼导诊\n先到服务台".encode(), "map.md")

    assert text.text == "高血压科普"
    assert "一楼导诊" in markdown.text


def test_parses_docx_paragraphs():
    docx = pytest.importorskip("docx")
    document = docx.Document()
    document.add_heading("就诊流程", level=1)
    document.add_paragraph("先挂号，再前往诊室。")
    output = BytesIO()
    document.save(output)

    parsed = parse_document(output.getvalue(), "flow.docx")

    assert parsed.text == "就诊流程\n\n先挂号，再前往诊室。"


def test_parses_text_pdf_and_rejects_blank_pdf():
    pypdf = pytest.importorskip("pypdf")
    from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

    writer = pypdf.PdfWriter()
    page = writer.add_blank_page(width=300, height=200)
    font = DictionaryObject(
        {
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type1"),
            NameObject("/BaseFont"): NameObject("/Helvetica"),
        }
    )
    page[NameObject("/Resources")] = DictionaryObject(
        {NameObject("/Font"): DictionaryObject({NameObject("/F1"): writer._add_object(font)})}
    )
    stream = DecodedStreamObject()
    stream.set_data(b"BT /F1 12 Tf 30 100 Td (Medical guide) Tj ET")
    page[NameObject("/Contents")] = writer._add_object(stream)
    output = BytesIO()
    writer.write(output)

    assert "Medical guide" in parse_document(output.getvalue(), "guide.pdf").text

    blank_writer = pypdf.PdfWriter()
    blank_writer.add_blank_page(width=100, height=100)
    blank = BytesIO()
    blank_writer.write(blank)
    with pytest.raises(KnowledgeDocumentError, match="扫描|文本"):
        parse_document(blank.getvalue(), "scan.pdf")


@pytest.mark.parametrize(
    ("data", "file_name"),
    [
        (b"", "empty.txt"),
        (b"not-a-docx", "bad.docx"),
        (b"binary", "bad.exe"),
    ],
)
def test_rejects_empty_broken_and_unsupported_documents(data: bytes, file_name: str):
    with pytest.raises(KnowledgeDocumentError):
        parse_document(data, file_name)
