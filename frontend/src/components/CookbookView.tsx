import { useLayoutEffect, useRef, useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import type { Recipe, Visuals } from '../App';

interface CookbookViewProps {
    recipe: Recipe
    visuals: Visuals | null
    viewMode: string
}

export default function CookbookView({ recipe, visuals, viewMode }: CookbookViewProps) {
    // Ref for description text to handle autofit
    const descriptionRef = useRef<HTMLParagraphElement>(null);

    // Refs for space calculation
    const ingredientsColumnRef = useRef<HTMLDivElement>(null);
    const ingredientsContentRef = useRef<HTMLUListElement>(null);
    const instructionsColumnRef = useRef<HTMLDivElement>(null);
    const instructionsListRef = useRef<HTMLOListElement>(null);

    // State for space metrics
    const [metrics, setMetrics] = useState<{
        instructionsColumnHeight: number;
        ingredientsColumnHeight: number;
        ingredientsContentHeight: number;
        instructionStepHeights: number[];
        instructionsAvailable: number;
        ingredientsAvailableForInstructions: number;
        splitIndex: number;
        secondColumnEndIndex: number;
        totalInstructionsNeeded: number;
        instructionsFitInColumn1: boolean;
        instructionsFitInColumn2: boolean;
    }>({
        instructionsColumnHeight: 0,
        ingredientsColumnHeight: 0,
        ingredientsContentHeight: 0,
        instructionStepHeights: [],
        instructionsAvailable: 0,
        ingredientsAvailableForInstructions: 0,
        splitIndex: recipe.instructions.length,
        secondColumnEndIndex: recipe.instructions.length,
        totalInstructionsNeeded: 0,
        instructionsFitInColumn1: true,
        instructionsFitInColumn2: true
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

    // Handle resize by resetting split to force remeasurement
    useEffect(() => {
        const handleResize = () => {
            setMetrics(prev => ({ ...prev, splitIndex: recipe.instructions.length }));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [recipe.instructions.length]);

    // Calculate space metrics and split index
    useLayoutEffect(() => {
        const calculateMetrics = () => {
            if (!ingredientsColumnRef.current || !instructionsColumnRef.current || !ingredientsContentRef.current || !instructionsListRef.current) return;

            // If we are not showing all instructions in the first column, we can't properly measure for the split calculation
            // because we need the heights of all items to know where to split.
            // However, if we have already split, we rely on the resize handler to reset us to full length.
            // So if we are here and splitIndex is not length, it means we just finished a split.
            // We should verify if the split is still valid or if we need to re-measure (which requires reset).
            // But for now, let's assume if we are split, we are good until resize.
            // BUT, we added metrics.splitIndex to dependencies. So this runs after split.
            // If we don't have all items, we shouldn't try to calculate a NEW split based on partial items
            // unless we are sure.
            // Actually, if splitIndex < length, we only have partial items.
            // If we try to calculate, we might calculate a smaller split, but never a larger one.
            // So let's only calculate if splitIndex === recipe.instructions.length.

            if (metrics.splitIndex !== recipe.instructions.length) return;

            const ingredientsColHeight = ingredientsColumnRef.current.clientHeight;
            const instructionsColHeight = instructionsColumnRef.current.clientHeight;
            const ingredientsContentHeight = ingredientsContentRef.current.scrollHeight;

            // Header heights
            const ingHeader = ingredientsColumnRef.current.querySelector('.cookbook-section-title');
            const ingServings = ingredientsColumnRef.current.querySelector('.cookbook-servings-subheader');
            const ingHeaderHeight = (ingHeader?.clientHeight || 0) + (ingServings?.clientHeight || 0);

            const instHeader = instructionsColumnRef.current.querySelector('.cookbook-section-title');
            const instHeaderHeight = instHeader?.clientHeight || 0;

            const instructionsAvailable = instructionsColHeight - instHeaderHeight;
            const ingredientsAvailable = ingredientsColHeight - ingHeaderHeight;
            const ingredientsAvailableForInstructions = Math.max(0, ingredientsAvailable - ingredientsContentHeight);

            // Measure instruction steps
            // We assume all instructions are initially rendered in the first list to measure them
            // However, since we are splitting them, we might need to measure them from the DOM
            // If we render them split, we can measure them in their respective places
            // But to calculate the split, we need their heights.
            // Strategy: The first time we run, splitIndex is length (all in first col).
            // We measure them. Then we update splitIndex.

            const stepHeights: number[] = [];
            let totalInstructionsNeeded = 0;

            // Collect heights from both lists if they are split
            // Actually, if we split, the ones in the second column might have different heights due to width.
            // But the user asked to "Calculate for each step the amount of space it will need in the instructions column"
            // So we should rely on the heights when they are in the instructions column.
            // If we already split, we might not have them all in the instructions column.
            // For now, let's assume we can get the heights from the rendered elements.
            // If we want to be precise according to the plan, we should measure them in the instructions column.
            // But we can't force them there without flickering.
            // Let's try to measure what we have.

            // If we haven't calculated yet (splitIndex is default), we measure all in instructions column.
            const instructionItems = instructionsListRef.current.children;
            for (let i = 0; i < instructionItems.length; i++) {
                const height = instructionItems[i].getBoundingClientRect().height;
                stepHeights.push(height);
                totalInstructionsNeeded += height;
            }

            // If we have split, we need to be careful. The items in the second column (ingredients column)
            // are not in instructionsListRef. We need to find them.
            // But wait, if we update state, we re-render.
            // So if we are in the initial state (all in instructions col), we measure and calculate split.

            let currentHeight = 0;
            let splitIdx = recipe.instructions.length;

            // Calculate split index based on instructions column availability
            for (let i = 0; i < stepHeights.length; i++) {
                const gap = 2.4;
                if (currentHeight + stepHeights[i] > instructionsAvailable) {
                    splitIdx = i;
                    break;
                }
                currentHeight += stepHeights[i] + gap;
            }

            // Calculate how many fit in the second column
            // The second column is narrower, so items will be taller.
            // We estimate the height increase based on the width ratio.
            const instructionsColWidth = instructionsColumnRef.current.clientWidth;
            const ingredientsColWidth = ingredientsColumnRef.current.clientWidth;
            // padding-left is 1.1rem approx 18px.
            const padding = 18;
            const widthRatio = (instructionsColWidth - padding) / (ingredientsColWidth - padding);

            // Wrapper overhead: marginTop 1rem (16) + border 1 + paddingTop 0.5rem (8) = 25px
            const wrapperOverhead = 25;

            let secondColHeight = wrapperOverhead;
            let secondColEndIdx = splitIdx;

            // Only calculate if we have items to put in col 2
            if (splitIdx < stepHeights.length) {
                for (let i = splitIdx; i < stepHeights.length; i++) {
                    const gap = 2.4;
                    // Estimate new height
                    const estimatedHeight = stepHeights[i] * widthRatio;

                    if (secondColHeight + estimatedHeight > ingredientsAvailableForInstructions) {
                        break;
                    }
                    secondColHeight += estimatedHeight + gap;
                    secondColEndIdx = i + 1;
                }
            }

            const instructionsFitInColumn2 = secondColEndIdx === stepHeights.length;

            // Only update if changed to avoid loops
            if (splitIdx !== metrics.splitIndex ||
                secondColEndIdx !== metrics.secondColumnEndIndex ||
                instructionsColHeight !== metrics.instructionsColumnHeight ||
                ingredientsColHeight !== metrics.ingredientsColumnHeight) {

                setMetrics({
                    instructionsColumnHeight: instructionsColHeight,
                    ingredientsColumnHeight: ingredientsColHeight,
                    ingredientsContentHeight: ingredientsContentHeight,
                    instructionStepHeights: stepHeights,
                    instructionsAvailable,
                    ingredientsAvailableForInstructions,
                    splitIndex: splitIdx,
                    secondColumnEndIndex: secondColEndIdx,
                    totalInstructionsNeeded,
                    instructionsFitInColumn1: splitIdx === recipe.instructions.length,
                    instructionsFitInColumn2
                });
            }
        };

        calculateMetrics();
    }, [recipe.instructions, recipe.ingredients, viewMode, metrics.splitIndex]);

    if (viewMode !== 'cookbook') return null;

    const firstColumnInstructions = recipe.instructions.slice(0, metrics.splitIndex);
    const secondColumnInstructions = recipe.instructions.slice(metrics.splitIndex, metrics.secondColumnEndIndex);

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
                                    {recipe.video_url && (
                                        <div className="channel-info-box">
                                            <QRCode value={recipe.video_url} size={60} />
                                            <div className="channel-name">
                                                {recipe.channel_name ? `@${recipe.channel_name}` : ''}
                                            </div>
                                        </div>
                                    )}
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
                            {/* Left Column: Ingredients + Overflow Instructions */}
                            <div className="cookbook-column" ref={ingredientsColumnRef}>
                                <h2 className="cookbook-section-title">
                                    Ingredients{recipe.servings ? (() => {
                                        const servingsMatch = recipe.servings.match(/(\d+)/);
                                        const servingsNum = servingsMatch ? parseInt(servingsMatch[1]) : null;
                                        return servingsNum ? ` (for ${servingsNum} ${servingsNum === 1 ? 'serving' : 'servings'})` : '';
                                    })() : ''}
                                </h2>
                                <ul className="cookbook-ingredients" ref={ingredientsContentRef}>
                                    {(() => {
                                        // Group ingredients by purpose
                                        const groupedIngredients: Record<string, typeof recipe.ingredients> = {};
                                        recipe.ingredients.forEach(item => {
                                            const purpose = item.purpose || 'cooking';
                                            if (!groupedIngredients[purpose]) {
                                                groupedIngredients[purpose] = [];
                                            }
                                            groupedIngredients[purpose].push(item);
                                        });

                                        // Sort purposes: cooking first, then others in order they appear
                                        const purposes = Object.keys(groupedIngredients);
                                        const cookingIndex = purposes.indexOf('cooking');
                                        if (cookingIndex > -1) {
                                            purposes.splice(cookingIndex, 1);
                                            purposes.unshift('cooking');
                                        }

                                        return purposes.flatMap(purpose =>
                                            groupedIngredients[purpose].map((item, index) => {
                                                let ingredientText = '';
                                                if (item.quantity && item.quantity !== '-') {
                                                    ingredientText += item.quantity;
                                                }
                                                if (item.unit && item.unit !== '-') {
                                                    if (ingredientText) ingredientText += ' ';
                                                    ingredientText += item.unit;
                                                }
                                                if (item.quantity.toLowerCase().includes('sprinkle') && item.unit === '-') {
                                                    ingredientText += ` of ${item.ingredient}`;
                                                } else {
                                                    if (ingredientText) ingredientText += ' ';
                                                    ingredientText += item.ingredient;
                                                }

                                                return (
                                                    <li key={`${purpose}-${index}`} className="cookbook-ingredient-item">
                                                        {purpose !== 'cooking' && index === 0 && (
                                                            <div style={{ fontWeight: 'bold', textTransform: 'capitalize', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                                                                {purpose}
                                                            </div>
                                                        )}
                                                        <span className="ingredient-text">
                                                            {ingredientText}
                                                        </span>
                                                    </li>
                                                );
                                            })
                                        );
                                    })()}
                                </ul>

                                {/* Overflow Instructions in Ingredients Column */}
                                {secondColumnInstructions.length > 0 && (
                                    <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '0.5rem' }}>
                                        <ol className="cookbook-instructions" start={metrics.splitIndex + 1}>
                                            {secondColumnInstructions.map((step) => (
                                                <li key={step.step_number} className="cookbook-instruction-item">
                                                    <p className="instruction-text">{step.instruction}</p>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Instructions */}
                            <div className="cookbook-column" ref={instructionsColumnRef}>
                                <h2 className="cookbook-section-title">Instructions</h2>
                                <ol className="cookbook-instructions" ref={instructionsListRef}>
                                    {/* Render all initially to measure, then slice */}
                                    {/* Actually, if we slice, we lose the refs to the ones that moved. 
                                        But we only need to measure once or when things change.
                                        If we render only slice, we can't measure the others in this column.
                                        But we only need to measure them to know if they fit.
                                        If we render them here, they will overflow.
                                        Let's render the first part here.
                                    */}
                                    {/* 
                                        Issue: If we render only the first part, how do we know the height of the second part 
                                        to know if it fits in the second column?
                                        We estimated it based on the first measurement (when splitIndex was full length).
                                        So we need to ensure we measure correctly.
                                        The first render will have splitIndex = length, so all instructions are here.
                                        We measure, then update splitIndex.
                                        Then we re-render.
                                        So this is correct.
                                    */}
                                    {metrics.splitIndex === recipe.instructions.length ?
                                        recipe.instructions.map((step) => (
                                            <li key={step.step_number} className="cookbook-instruction-item">
                                                <p className="instruction-text">{step.instruction}</p>
                                            </li>
                                        )) :
                                        firstColumnInstructions.map((step) => (
                                            <li key={step.step_number} className="cookbook-instruction-item">
                                                <p className="instruction-text">{step.instruction}</p>
                                            </li>
                                        ))
                                    }
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Debug Info */}
            <div style={{
                marginTop: '2rem',
                padding: '1rem',
                backgroundColor: 'white',
                color: 'black',
                border: '1px solid #ccc'
            }}>
                <div><strong>Debug Info</strong></div>
                <div>Instructions Column Height: {metrics.instructionsColumnHeight}</div>
                <div>Ingredients Column Height: {metrics.ingredientsColumnHeight}</div>
                <div>Ingredients Content Height: {metrics.ingredientsContentHeight}</div>
                <div>Instructions Available: {metrics.instructionsAvailable}</div>
                <div>Ingredients Available for Instructions: {metrics.ingredientsAvailableForInstructions}</div>
                <div>Split Index: {metrics.splitIndex}</div>
                <div>Second Column End Index: {metrics.secondColumnEndIndex}</div>
                <div>Total Instructions Needed: {metrics.totalInstructionsNeeded}</div>
                <div>Instructions Fit in Col 1: {metrics.instructionsFitInColumn1 ? 'Yes' : 'No'}</div>
                <div>Remaining Instructions Fit in Col 2: {metrics.instructionsFitInColumn2 ? 'Yes' : 'No'}</div>
                <div>Step Heights: {metrics.instructionStepHeights.join(', ')}</div>
                <div>Total Steps: {recipe.instructions.length}</div>
                <div style={{ marginTop: '1rem' }}>
                    <strong>Step Placement:</strong>
                    {recipe.instructions.map((step, index) => {
                        let placement = 'Not Shown';
                        if (index < metrics.splitIndex) {
                            placement = 'Column 1 (Instructions)';
                        } else if (index < metrics.secondColumnEndIndex) {
                            placement = 'Column 2 (Ingredients)';
                        }
                        return (
                            <div key={step.step_number}>
                                Step {step.step_number}: {placement}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    )
}
