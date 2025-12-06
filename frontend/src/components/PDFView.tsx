import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import config from '../config';

// Configure worker for PDF.js using local worker file (no CORS issues)
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PDFViewProps {
    videoId: string;
}

export default function PDFView({ videoId }: PDFViewProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageWidth, setPageWidth] = useState<number>(500);
    const [pdfUrl, setPdfUrl] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Set PDF URL with inline parameter to display in browser
        const url = `${config.API_BASE_URL}/api/cache/${videoId}/pdf?inline=true`;
        setPdfUrl(url);
    }, [videoId]);

    useEffect(() => {
        // Calculate page width based on window size
        const calculatePageWidth = () => {
            // Get the available width for both pages side by side
            // Subtract some padding/margin (e.g., 100px total)
            const availableWidth = window.innerWidth - 100;
            // Divide by 2 for two pages, with a gap between them
            const width = (availableWidth - 40) / 2; // 40px gap between pages
            setPageWidth(Math.max(400, Math.min(width, 600))); // Min 400px, max 600px per page
        };

        calculatePageWidth();
        window.addEventListener('resize', calculatePageWidth);
        return () => window.removeEventListener('resize', calculatePageWidth);
    }, []);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setLoading(false);
    }

    function onDocumentLoadError(error: Error) {
        console.error('Error loading PDF:', error);
        console.error('Error details:', error.message, error.stack);
        setError(`Failed to load PDF: ${error.message}. The PDF might still be generating or there may be a CORS issue.`);
        setLoading(false);
    }

    return (
        <div className="pdf-viewer-container">
            {loading && <div className="pdf-loading">Loading PDF...</div>}
            {error && <div className="pdf-error">{error}</div>}
            
            <Document
                file={{
                    url: pdfUrl,
                    httpHeaders: {
                        'Accept': 'application/pdf',
                    },
                    withCredentials: false,
                }}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={<div>Loading PDF document...</div>}
                options={{
                    cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
                    standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/standard_fonts/`,
                }}
            >
                <div className="pdf-spread">
                    {numPages >= 1 && (
                        <div className="pdf-page-container">
                            <Page 
                                pageNumber={1} 
                                width={pageWidth}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                            />
                        </div>
                    )}
                    {numPages >= 2 && (
                        <div className="pdf-page-container">
                            <Page 
                                pageNumber={2} 
                                width={pageWidth}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                            />
                        </div>
                    )}
                </div>
            </Document>
        </div>
    );
}

