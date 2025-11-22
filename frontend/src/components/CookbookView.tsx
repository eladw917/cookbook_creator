import { useLayoutEffect, useRef, useState } from 'react';
import type { Recipe, Visuals } from '../App';

interface CookbookViewProps {
    recipe: Recipe
    visuals: Visuals | null
    viewMode: string
}

interface SpaceMetrics {
    available: number;
    needed: number;
    diff: number;
}

interface DetailedMetrics {
    ingredientsAvailableForIngredients: number;
    ingredientsNeededForIngredients: number;
    ingredientsAvailableForInstructions: number;
    ingredientsUsed: number;
    instructionsUsed: number;
    diff: number;
}

export default function CookbookView({ recipe, visuals, viewMode }: CookbookViewProps) {
    // Ref for description text to handle autofit
    const descriptionRef = useRef<HTMLParagraphElement>(null);

    // Refs for space calculation
    const ingredientsColumnRef = useRef<HTMLDivElement>(null);
    const ingredientsContentRef = useRef<HTMLUListElement>(null);
    const instructionsColumnRef = useRef<HTMLDivElement>(null);
    const instructionsContentRef = useRef<HTMLOListElement>(null);

    // State for space metrics
    const [ingredientsMetrics, setIngredientsMetrics] = useState<SpaceMetrics>({ available: 0, needed: 0, diff: 0 });
    const [instructionsMetrics, setInstructionsMetrics] = useState<SpaceMetrics>({ available: 0, needed: 0, diff: 0 });
    const [detailedMetrics, setDetailedMetrics] = useState<DetailedMetrics>({
        ingredientsAvailableForIngredients: 0,
        ingredientsNeededForIngredients: 0,
        ingredientsAvailableForInstructions: 0,
        ingredientsUsed: 0,
        instructionsUsed: 0,
        diff: 0
    });

    useLayoutEffect(() => {
        const adjustFontSize = () => {
            const element = descriptionRef.current;
            if (!element) return;

            // Reset to start size
            let size = 0.9;
            element.style.fontSize = `${size}rem`;

            // Shrink until it fits or hits minimum
            // We check if scrollHeight is greater than clientHeight (vertical overflow)
            while (element.scrollHeight > element.clientHeight && size > 0.5) {
                size -= 0.05;
                element.style.fontSize = `${size}rem`;
            }
        };

        adjustFontSize();
        // Re-run on window resize just in case
        window.addEventListener('resize', adjustFontSize);
        return () => window.removeEventListener('resize', adjustFontSize);
    }, [recipe.description, viewMode]); // Re-run when description or view mode changes

    // Calculate space metrics for ingredients and instructions
    useLayoutEffect(() => {
        const calculateSpaceMetrics = () => {
            let ingredientsAvailable = 0;
            let ingredientsNeeded = 0;
            let instructionsAvailable = 0;
            let instructionsNeeded = 0;

            // Calculate ingredients metrics
            if (ingredientsColumnRef.current && ingredientsContentRef.current) {
                const columnHeight = ingredientsColumnRef.current.clientHeight;
                const contentHeight = ingredientsContentRef.current.scrollHeight;

                // Get the header height to subtract from available space
                const header = ingredientsColumnRef.current.querySelector('.cookbook-section-title');
                const servings = ingredientsColumnRef.current.querySelector('.cookbook-servings-subheader');
                const headerHeight = (header?.clientHeight || 0) + (servings?.clientHeight || 0);

                ingredientsAvailable = columnHeight - headerHeight;
                ingredientsNeeded = contentHeight;

                setIngredientsMetrics({
                    available: Math.round(ingredientsAvailable),
                    needed: Math.round(ingredientsNeeded),
                    diff: Math.round(ingredientsAvailable - ingredientsNeeded)
                });
            }

            // Calculate instructions metrics
            if (instructionsColumnRef.current && instructionsContentRef.current) {
                const columnHeight = instructionsColumnRef.current.clientHeight;
                const contentHeight = instructionsContentRef.current.scrollHeight;

                // Get the header height to subtract from available space
                const header = instructionsColumnRef.current.querySelector('.cookbook-section-title');
                const headerHeight = header?.clientHeight || 0;

                instructionsAvailable = columnHeight - headerHeight;
                instructionsNeeded = contentHeight;

                setInstructionsMetrics({
                    available: Math.round(instructionsAvailable),
                    needed: Math.round(instructionsNeeded),
                    diff: Math.round(instructionsAvailable - instructionsNeeded)
                });
            }

            // Calculate detailed metrics for ingredients column
            if (ingredientsAvailable > 0 && instructionsAvailable > 0) {
                const ingredientsUsed = Math.min(ingredientsNeeded, ingredientsAvailable);
                const instructionsUsed = Math.min(instructionsNeeded, instructionsAvailable);

                // Space available in ingredients column after ingredients are placed
                const ingredientsRemainingSpace = ingredientsAvailable - ingredientsUsed;

                // Total available space in ingredients column
                const totalIngredientsColumnSpace = ingredientsAvailable;

                setDetailedMetrics({
                    ingredientsAvailableForIngredients: Math.round(totalIngredientsColumnSpace),
                    ingredientsNeededForIngredients: Math.round(ingredientsNeeded),
                    ingredientsAvailableForInstructions: Math.round(ingredientsRemainingSpace),
                    ingredientsUsed: Math.round(ingredientsUsed),
                    instructionsUsed: Math.round(instructionsUsed),
                    diff: Math.round(ingredientsRemainingSpace)
                });
            }
        };

        calculateSpaceMetrics();
        // Re-run on window resize
        window.addEventListener('resize', calculateSpaceMetrics);
        return () => window.removeEventListener('resize', calculateSpaceMetrics);
    }, [recipe.ingredients, recipe.instructions, viewMode]);

    if (viewMode !== 'cookbook') return null;

    return (
        <>
            <div className="cookbook-spread">
                {/* Page 1: Visuals & Story */}
                <div className="cookbook-page-container">
                    <div className="cookbook-page cookbook-page-1">
                        <div className="cookbook-hero">
                            {visuals?.['dish_visual']?.frame_base64 ? (
                                <img
                                    src={`data:image/jpeg;base64,${visuals['dish_visual'].frame_base64}`}
                                    alt={recipe.title}
                                    className="cookbook-hero-image"
                                />
                            ) : (
                                <div className="cookbook-hero-placeholder">
                                    🍽️
                                </div>
                            )}
                        </div>

                        <div className="cookbook-page-1-content">
                            <h1 className="cookbook-title">{recipe.title}</h1>

                            <div className="cookbook-description" style={{ flex: 1, overflow: 'hidden' }}>
                                <p ref={descriptionRef} style={{ margin: 0, height: '100%' }}>
                                    {recipe.description}
                                </p>
                            </div>

                            <div className="cookbook-timing-details">
                                <div className="timing-item">
                                    <span className="timing-label">Prep</span>
                                    <span className="timing-value">{recipe.prep_time}</span>
                                </div>
                                <div className="timing-item">
                                    <span className="timing-label">Cook</span>
                                    <span className="timing-value">{recipe.cook_time}</span>
                                </div>
                                <div className="timing-item">
                                    <span className="timing-label">Total</span>
                                    <span className="timing-value">{recipe.total_time}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page 2: Ingredients & Instructions */}
                <div className="cookbook-page-container">
                    <div className="cookbook-page cookbook-page-2">
                        <div className="cookbook-two-column">
                            {/* Left Column: Ingredients */}
                            <div className="cookbook-column" ref={ingredientsColumnRef}>
                                <h2 className="cookbook-section-title">Ingredients</h2>
                                {recipe.servings && (
                                    <div className="cookbook-servings-subheader">
                                        {recipe.servings}
                                    </div>
                                )}
                                <ul className="cookbook-ingredients" ref={ingredientsContentRef}>
                                    {recipe.ingredients.map((item, index) => {
                                        // Format ingredient string
                                        // Format ingredient string
                                        let ingredientText = '';
                                        if (item.quantity && item.quantity !== '-') {
                                            ingredientText += item.quantity;
                                        }

                                        // Handle unit
                                        if (item.unit && item.unit !== '-') {
                                            if (ingredientText) ingredientText += ' ';
                                            ingredientText += item.unit;
                                        }

                                        // Handle "sprinkle" case or just add ingredient
                                        if (item.quantity.toLowerCase().includes('sprinkle') && item.unit === '-') {
                                            ingredientText += ` of ${item.ingredient}`;
                                        } else {
                                            if (ingredientText) ingredientText += ' ';
                                            ingredientText += item.ingredient;
                                        }

                                        return (
                                            <li key={index} className="cookbook-ingredient-item">
                                                <span className="ingredient-text">
                                                    {ingredientText}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            {/* Right Column: Instructions */}
                            <div className="cookbook-column" ref={instructionsColumnRef}>
                                <h2 className="cookbook-section-title">Instructions</h2>
                                <ol className="cookbook-instructions" ref={instructionsContentRef}>
                                    {recipe.instructions.map((step) => (
                                        <li key={step.step_number} className="cookbook-instruction-item">
                                            <p className="instruction-text">{step.instruction}</p>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Space Metrics Display */}
            <div style={{
                marginTop: '2rem',
                padding: '1rem',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                lineHeight: '1.6'
            }}>
                <div style={{ marginBottom: '1rem' }}>
                    <strong>Instructions:</strong><br />
                    area available: {instructionsMetrics.available}px<br />
                    area needed: {instructionsMetrics.needed}px<br />
                    diff: {instructionsMetrics.diff}px
                    {instructionsMetrics.diff < 0 && <span style={{ color: 'red', marginLeft: '0.5rem' }}>⚠️ OVERFLOW</span>}
                </div>

                <div>
                    <strong>Ingredients:</strong><br />
                    area available for ingredients: {detailedMetrics.ingredientsAvailableForIngredients}px<br />
                    area needed for ingredients: {detailedMetrics.ingredientsNeededForIngredients}px<br />
                    area available for instructions: {detailedMetrics.ingredientsAvailableForInstructions}px<br />
                    area used for ingredients: {detailedMetrics.ingredientsUsed}px<br />
                    area used by instructions: {detailedMetrics.instructionsUsed}px<br />
                    diff: {detailedMetrics.diff}px
                    {detailedMetrics.diff < 0 && <span style={{ color: 'red', marginLeft: '0.5rem' }}>⚠️ OVERFLOW</span>}
                </div>
            </div>
        </>
    )
}
