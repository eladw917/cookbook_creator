import React, { useState, useEffect } from 'react';
import config from '../config';

interface PizzaTrackerProps {
    videoId: string;
}

interface Status {
    metadata: boolean;
    transcript: boolean;
    recipe: boolean;
    timestamps: boolean;
    frames: boolean;
}

const PizzaTracker: React.FC<PizzaTrackerProps> = ({ videoId }) => {
    const [status, setStatus] = useState<Status>({
        metadata: false,
        transcript: false,
        recipe: false,
        timestamps: false,
        frames: false
    });

    useEffect(() => {
        if (!videoId) return;

        // Poll status every 1 second
        const interval = setInterval(fetchStatus, 1000);
        fetchStatus(); // Initial fetch

        return () => clearInterval(interval);
    }, [videoId]);

    const fetchStatus = async () => {
        try {
            const response = await fetch(`${config.API_BASE_URL}/api/cache/${videoId}/status`);
            if (response.ok) {
                const data = await response.json();
                setStatus(data);
            }
        } catch (error) {
            console.error('Error fetching status:', error);
        }
    };

    const steps = [
        { key: 'metadata', label: 'Metadata', icon: '📋' },
        { key: 'transcript', label: 'Transcript', icon: '📝' },
        { key: 'recipe', label: 'Recipe', icon: '🍳' },
        { key: 'timestamps', label: 'Timing', icon: '⏱️' },
        { key: 'frames', label: 'Visuals', icon: '📸' },
    ];

    // Determine current active step
    // The active step is the first one that is NOT completed (false).
    // If all are true, we are done (or on the last step).
    // Actually, if metadata is true, we are working on transcript (so transcript is active).
    // If metadata is false, we are working on metadata (so metadata is active).
    let activeIndex = steps.findIndex(step => !status[step.key as keyof Status]);
    if (activeIndex === -1) activeIndex = steps.length; // All done

    return (
        <div className="pizza-tracker-container">
            <h3>🚀 Extracting Recipe...</h3>
            <div className="pizza-tracker-steps">
                {steps.map((step, index) => {
                    const isCompleted = status[step.key as keyof Status];
                    const isActive = index === activeIndex;
                    const isPending = index > activeIndex;

                    let stepClass = 'tracker-step';
                    if (isCompleted) stepClass += ' completed';
                    if (isActive) stepClass += ' active';
                    if (isPending) stepClass += ' pending';

                    return (
                        <div key={step.key} className={stepClass}>
                            <div className="step-icon-circle">
                                {isCompleted ? '✓' : step.icon}
                            </div>
                            <div className="step-label">{step.label}</div>
                            {index < steps.length - 1 && (
                                <div className={`step-connector ${isCompleted ? 'completed' : ''}`}></div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="tracker-status-text">
                {activeIndex < steps.length ? (
                    <p>Processing: <strong>{steps[activeIndex].label}</strong>...</p>
                ) : (
                    <p>✨ Extraction Complete! Finalizing...</p>
                )}
            </div>
        </div>
    );
};

export default PizzaTracker;
