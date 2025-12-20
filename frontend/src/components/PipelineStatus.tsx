import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

interface PipelineStatusProps {
    videoId: string;
    onStatusChange?: () => void;
}

interface Status {
    metadata: boolean;
    transcript: boolean;
    recipe: boolean;
    timestamps: boolean;
    frames: boolean;
    pdf: boolean;
}

const PipelineStatus: React.FC<PipelineStatusProps> = ({ videoId, onStatusChange }) => {
    const [status, setStatus] = useState<Status | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (videoId) {
            fetchStatus();
        } else {
            setStatus(null);
        }
    }, [videoId]);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/cache/${videoId}/status`);
            if (response.ok) {
                const data = await response.json();
                setStatus(data);
            } else {
                // If 404 or other error, assume no cache (all false)
                setStatus({
                    metadata: false,
                    transcript: false,
                    recipe: false,
                    timestamps: false,
                    frames: false,
                    pdf: false
                });
            }
        } catch (error) {
            console.error('Error fetching status:', error);
            setStatus({
                metadata: false,
                transcript: false,
                recipe: false,
                timestamps: false,
                frames: false,
                pdf: false
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleStep = async (stepName: keyof Status) => {
        if (!status) return;

        if (status[stepName]) {
            // If checked (cached), unchecking means clearing cache
            try {
                await fetch(`${API_BASE_URL}/api/cache/${videoId}/${stepName}`, {
                    method: 'DELETE',
                });
                // Refresh status
                fetchStatus();
                if (onStatusChange) onStatusChange();
            } catch (error) {
                console.error('Error clearing step:', error);
            }
        } else {
            // If unchecked (not cached), checking doesn't do anything immediately
            // It just means "I want this to be part of the extraction"
            // But for now, let's just keep it simple: Checkboxes represent CACHE STATE.
            // Unchecking = Clear Cache. Checking = Not possible if not cached (it will be checked after extraction).
            // Wait, the user said: "If the video is new, the user will see the 5 checkboxes empty"
            // This implies they might want to SELECT what to run?
            // But our pipeline is sequential. You can't run frames without timestamps.
            // So let's stick to: Checkboxes show what is DONE. Unchecking deletes it.
        }
    };

    if (!videoId) return null;

    if (loading) {
        return <div className="pipeline-status-container loading">Checking cache status...</div>;
    }

    if (!status) return null;

    const steps: { key: keyof Status; label: string }[] = [
        { key: 'metadata', label: 'Metadata' },
        { key: 'transcript', label: 'Transcript' },
        { key: 'recipe', label: 'Recipe Extraction' },
        { key: 'timestamps', label: 'Timestamp Analysis' },
        { key: 'frames', label: 'Frame Extraction' },
        { key: 'pdf', label: 'PDF Generation' },
    ];

    return (
        <div className="pipeline-status-container">
            <h3>Pipeline Status</h3>
            <div className="status-checkboxes">
                {steps.map((step) => (
                    <label key={step.key} className={`status-checkbox ${status[step.key] ? 'cached' : 'empty'}`}>
                        <input
                            type="checkbox"
                            checked={status[step.key]}
                            onChange={() => toggleStep(step.key)}
                            disabled={!status[step.key]} // Disable if not cached (can't "check" it manually, must run extract)
                        />
                        <span className="checkmark"></span>
                        <span className="label-text">{step.label}</span>
                        {status[step.key] ? <span className="status-tag cached">Cached</span> : <span className="status-tag new">New</span>}
                    </label>
                ))}
            </div>
            <p className="status-hint">
                * Uncheck a step to clear its cache and force re-extraction. Empty steps will be processed on extraction.
            </p>
        </div>
    );
};

export default PipelineStatus;
