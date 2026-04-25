import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ActionIcon, Anchor, Group, Loader, Stack, Text } from "@mantine/core";
import { ChevronLeft, ChevronRight, Download, Minus, RotateCcw, Plus } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface PDFViewerInDrawerProps {
  previewUrl: string;
  downloadUrl: string;
  fileName: string;
}

const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.1;
const PDF_DOCUMENT_OPTIONS = { withCredentials: true } as const;

function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value.toFixed(2))));
}

export function PDFViewerInDrawer({ previewUrl, downloadUrl, fileName }: PDFViewerInDrawerProps): JSX.Element {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(DEFAULT_SCALE);

  function onDocumentLoadSuccess({ numPages: n }: { numPages: number }): void {
    setNumPages(n);
    setPageNumber(1);
    setScale(DEFAULT_SCALE);
  }

  return (
    <Stack gap="sm" h="100%">
      <Group justify="space-between" align="center">
        <Group gap="xs" wrap="nowrap">
          <ActionIcon
            variant="subtle"
            onClick={() => setScale((current) => clampScale(current - SCALE_STEP))}
            disabled={scale <= MIN_SCALE}
            aria-label="Zoom out"
          >
            <Minus size={16} />
          </ActionIcon>
          <Text size="sm" fw={500} miw={56} ta="center">{Math.round(scale * 100)}%</Text>
          <ActionIcon
            variant="subtle"
            onClick={() => setScale((current) => clampScale(current + SCALE_STEP))}
            disabled={scale >= MAX_SCALE}
            aria-label="Zoom in"
          >
            <Plus size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            onClick={() => setScale(DEFAULT_SCALE)}
            disabled={scale === DEFAULT_SCALE}
            aria-label="Reset zoom"
          >
            <RotateCcw size={16} />
          </ActionIcon>
        </Group>
        <Anchor href={downloadUrl} download={fileName} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "var(--mantine-font-size-xs)" }}>
          <Download size={14} />
          Download
        </Anchor>
      </Group>

      <Text size="xs" c="dimmed" truncate="end">{fileName}</Text>

      <div style={{ flex: 1, overflow: "auto", border: "1px solid var(--mantine-color-gray-3)", borderRadius: 8, background: "var(--mantine-color-gray-0)", padding: 8 }}>
        <Group justify="center">
          <Document
            file={previewUrl}
            options={PDF_DOCUMENT_OPTIONS}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<Loader size="sm" />}
            error={<Text c="red" size="sm">Failed to load PDF. The file may be corrupted or inaccessible.</Text>}
          >
            <Page pageNumber={pageNumber} scale={scale} />
          </Document>
        </Group>
      </div>

      {numPages > 1 && (
        <Group justify="center" gap="xs">
          <ActionIcon
            variant="subtle"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => p - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </ActionIcon>
          <Text size="sm">{pageNumber} / {numPages}</Text>
          <ActionIcon
            variant="subtle"
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </ActionIcon>
        </Group>
      )}
    </Stack>
  );
}
