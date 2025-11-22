import React from 'react'

interface UrlInputProps {
    url: string
    onUrlChange: (url: string) => void
    onExtract: (url: string) => void
    loading: boolean
}

export default function UrlInput({ url, onUrlChange, onExtract, loading }: UrlInputProps) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (url.trim()) {
            onExtract(url.trim())
        }
    }

    return (
        <div className="url-input-container">
            <form onSubmit={handleSubmit} className="url-input-form">
                <input
                    type="text"
                    value={url}
                    onChange={(e) => onUrlChange(e.target.value)}
                    placeholder="Paste YouTube URL here... (e.g., https://www.youtube.com/watch?v=...)"
                    disabled={loading}
                />
                <button type="submit" disabled={loading || !url.trim()}>
                    {loading ? 'Extracting...' : 'Extract Recipe'}
                </button>
            </form>
        </div>
    )
}
