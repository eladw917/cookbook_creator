import React, { useState, useEffect } from 'react';
import config from '../config';

interface PipelineStatus {
    metadata: boolean;
    transcript: boolean;
    recipe: boolean;
    timestamps: boolean;
    frames: boolean;
}

interface CachedVideo {
    video_id: string;
    title: string;
    pipeline_status: PipelineStatus;
}

interface CacheViewProps {
    onSelectVideo: (videoId: string, url: string) => void;
}

const CacheView: React.FC<CacheViewProps> = ({ onSelectVideo }) => {
    const [cachedVideos, setCachedVideos] = useState<CachedVideo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCachedVideos();
    }, []);

    const fetchCachedVideos = async () => {
        try {
            const response = await fetch(`${config.API_BASE_URL}/api/cache`);
            const data = await response.json();
            setCachedVideos(data.videos);
        } catch (error) {
            console.error('Error fetching cached videos:', error);
        } finally {
            setLoading(false);
        }
    };

    const clearVideo = async (videoId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete all cached data for this video?')) return;

        try {
            await fetch(`${config.API_BASE_URL}/api/cache/${videoId}`, {
                method: 'DELETE',
            });
            fetchCachedVideos(); // Refresh the list
        } catch (error) {
            console.error('Error clearing video:', error);
        }
    };

    if (loading) {
        return <div className="cache-view loading">Loading cache...</div>;
    }

    if (cachedVideos.length === 0) {
        return (
            <div className="cache-view empty">
                <p>No cached videos yet. Extract a recipe to get started!</p>
            </div>
        );
    }

    return (
        <div className="cache-view">
            <h2>📦 Cached Videos</h2>
            <div className="cached-videos-list">
                {cachedVideos.map((video) => (
                    <div
                        key={video.video_id}
                        className="cached-video-card clickable"
                        onClick={() => onSelectVideo(video.video_id, `https://www.youtube.com/watch?v=${video.video_id}`)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="video-header">
                            <h3>{video.title}</h3>
                            <button
                                className="btn-clear"
                                onClick={(e) => clearVideo(video.video_id, e)}
                                title="Delete from cache"
                            >
                                🗑️
                            </button>
                        </div>

                        <div className="video-id">ID: {video.video_id}</div>

                        <div className="mini-status" style={{ display: 'flex', gap: '5px' }}>
                            {Object.entries(video.pipeline_status).map(([key, value]) => (
                                <span
                                    key={key}
                                    className={`status-dot ${value ? 'completed' : 'pending'}`}
                                    title={key}
                                    style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        backgroundColor: value ? '#4caf50' : '#ddd',
                                        display: 'inline-block'
                                    }}
                                ></span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CacheView;
