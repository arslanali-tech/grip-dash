export type PdfOrientation = 'portrait' | 'landscape';
export type PdfCaptureMode = 'scroll' | 'bounds';

type ExportPdfOptions = {
  filename: string;
  orientation?: PdfOrientation;
  capture?: PdfCaptureMode;
  marginPt?: number;
  scale?: number;
  backgroundColor?: string;
  onClone?: (clonedDocument: Document, clonedElement: HTMLElement) => void;
};

function syncFormFieldValues(source: HTMLElement, target: HTMLElement) {
  const sourceFields = source.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input, textarea, select'
  );
  const targetFields = target.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input, textarea, select'
  );

  sourceFields.forEach((sourceEl, idx) => {
    const targetEl = targetFields[idx];
    if (!targetEl) return;

    // Preserve value/checked state for common form controls.
    if (sourceEl instanceof HTMLInputElement && targetEl instanceof HTMLInputElement) {
      if (sourceEl.type === 'checkbox' || sourceEl.type === 'radio') {
        targetEl.checked = sourceEl.checked;
      } else {
        targetEl.value = sourceEl.value;
      }
      return;
    }

    if (sourceEl instanceof HTMLTextAreaElement && targetEl instanceof HTMLTextAreaElement) {
      targetEl.value = sourceEl.value;
      return;
    }

    if (sourceEl instanceof HTMLSelectElement && targetEl instanceof HTMLSelectElement) {
      targetEl.value = sourceEl.value;
      return;
    }

    try {
      (targetEl as any).value = (sourceEl as any).value;
    } catch {
      // ignore
    }
  });
}

export async function exportElementToPdf(
  element: HTMLElement,
  {
    filename,
    orientation = 'landscape',
    capture = 'scroll',
    marginPt = 24,
    scale = 2,
    backgroundColor = '#ffffff',
    onClone,
  }: ExportPdfOptions
) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  // Capture
  const canvas = await html2canvas(element, {
    backgroundColor,
    scale,
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    ...(capture === 'scroll' ? { width: element.scrollWidth, height: element.scrollHeight } : {}),
    windowWidth: document.documentElement.clientWidth,
    windowHeight: document.documentElement.clientHeight,
    onclone: (clonedDocument: Document, clonedElement: HTMLElement) => {
      try {
        syncFormFieldValues(element, clonedElement);
      } catch {
        // ignore
      }

      try {
        onClone?.(clonedDocument, clonedElement);
      } catch (e) {
        console.warn('exportElementToPdf onClone failed', e);
      }
    },
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({
    orientation: orientation === "landscape" ? "l" : "p",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const usableWidth = pageWidth - marginPt * 2;
  const usableHeight = pageHeight - marginPt * 2;

  const imgWidth = usableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Multi-page: draw the same image and move it up each page; PDF page clips the overflow.
  let y = marginPt;
  let remaining = imgHeight;

  pdf.addImage(imgData, "PNG", marginPt, y, imgWidth, imgHeight, undefined, "FAST");
  remaining -= usableHeight;

  while (remaining > 0) {
    pdf.addPage();
    y = marginPt - (imgHeight - remaining);
    pdf.addImage(imgData, "PNG", marginPt, y, imgWidth, imgHeight, undefined, "FAST");
    remaining -= usableHeight;
  }

  pdf.save(filename);
}
