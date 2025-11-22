import { useState } from 'react'
import CookbookView from './CookbookView'
import type { Recipe, Visuals } from '../App'

interface RecipeViewProps {
    recipe: Recipe
    visuals: Visuals | null
    loading: boolean
}

export default function RecipeView({ recipe, visuals, loading }: RecipeViewProps) {
    const [viewMode, setViewMode] = useState<'standard' | 'cookbook'>('standard')

    return (
        <div className="recipe-container">
            <div className="recipe-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>{recipe.title}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            className={`btn-secondary no-print ${viewMode === 'standard' ? 'active' : ''}`}
                            onClick={() => setViewMode('standard')}
                        >
                            📋 Standard View
                        </button>
                        <button
                            className={`btn-secondary no-print ${viewMode === 'cookbook' ? 'active' : ''}`}
                            onClick={() => setViewMode('cookbook')}
                        >
                            📖 Cookbook View
                        </button>

                    </div>
                </div>

                {viewMode === 'cookbook' ? (
                    <CookbookView recipe={recipe} visuals={visuals} viewMode={viewMode} />
                ) : (
                    <>
                        {visuals?.['dish_visual']?.frame_base64 ? (
                            <div className="recipe-hero-layout" style={{ display: 'flex', gap: '2rem', alignItems: 'stretch', marginTop: '2rem' }}>
                                {/* Left: Image */}
                                <div className="dish-visual-hero" style={{ flex: '2' }}>
                                    <img
                                        src={`data:image/jpeg;base64,${visuals['dish_visual'].frame_base64}`}
                                        alt="Final Dish"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            borderRadius: '16px',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                            border: '2px solid var(--primary)'
                                        }}
                                    />
                                </div>

                                {/* Right: Description & Metadata Column */}
                                <div className="recipe-meta-column" style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center' }}>
                                    <div className="recipe-description-standard" style={{
                                        fontSize: '1.1rem',
                                        lineHeight: '1.6',
                                        fontStyle: 'italic',
                                        color: 'var(--text)',
                                        padding: '1rem',
                                        background: 'var(--surface-light)',
                                        borderRadius: '8px',
                                        borderLeft: '4px solid var(--primary)'
                                    }}>
                                        {recipe.description || `A delicious recipe for ${recipe.title}!`}
                                    </div>

                                    <div className="meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="meta-item">
                                            <strong>Servings</strong>
                                            <span>{recipe.servings}</span>
                                        </div>
                                        <div className="meta-item">
                                            <strong>Prep Time</strong>
                                            <span>{recipe.prep_time}</span>
                                        </div>
                                        <div className="meta-item">
                                            <strong>Cook Time</strong>
                                            <span>{recipe.cook_time}</span>
                                        </div>
                                        <div className="meta-item">
                                            <strong>Total Time</strong>
                                            <span>{recipe.total_time}</span>
                                        </div>
                                        <div className="meta-item" style={{ gridColumn: '1 / -1' }}>
                                            <strong>Difficulty</strong>
                                            <span>{recipe.difficulty}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Fallback for no image: Original Grid Layout */
                            <div className="recipe-meta">
                                <div className="meta-item">
                                    <strong>Servings</strong>
                                    <span>{recipe.servings}</span>
                                </div>
                                <div className="meta-item">
                                    <strong>Prep Time</strong>
                                    <span>{recipe.prep_time}</span>
                                </div>
                                <div className="meta-item">
                                    <strong>Cook Time</strong>
                                    <span>{recipe.cook_time}</span>
                                </div>
                                <div className="meta-item">
                                    <strong>Total Time</strong>
                                    <span>{recipe.total_time}</span>
                                </div>
                                <div className="meta-item">
                                    <strong>Difficulty</strong>
                                    <span>{recipe.difficulty}</span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {viewMode === 'standard' && (
                <>
                    <div className="recipe-section">
                        <h3>🥘 Ingredients</h3>
                        <div className="ingredients-list">
                            {recipe.ingredients.map((item, index) => (
                                <div key={index} className="ingredient-item">
                                    <span className="ingredient-quantity">
                                        {item.quantity} {item.unit}
                                    </span>
                                    <span>{item.ingredient}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="recipe-section">
                        <h3>👨‍🍳 Instructions</h3>
                        <div className="instructions-list">
                            {recipe.instructions.map((step) => {
                                const stepKey = step.step_number.toString()
                                const visual = visuals?.[stepKey]
                                const hasVisual = visual?.frame_base64

                                return (
                                    <div
                                        key={step.step_number}
                                        className={`instruction-item ${step.is_key_step ? 'key-step' : ''}`}
                                    >
                                        <div className="instruction-header">
                                            <div className="step-number">{step.step_number}</div>
                                            <div className="step-category">{step.category}</div>
                                            {step.is_key_step && <span>⭐</span>}
                                        </div>
                                        <p className="instruction-text">{step.instruction}</p>

                                        {step.is_key_step && (
                                            <div className="step-visual">
                                                {loading && !hasVisual && (
                                                    <div className="loading-spinner">
                                                        <div className="spinner"></div>
                                                        <p>Extracting visual...</p>
                                                    </div>
                                                )}
                                                {hasVisual && (
                                                    <div>
                                                        <img
                                                            src={`data:image/jpeg;base64,${visual.frame_base64}`}
                                                            alt={`Step ${step.step_number}`}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
