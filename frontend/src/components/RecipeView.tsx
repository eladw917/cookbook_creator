import CookbookView from './CookbookView'
import type { Recipe, Visuals } from '../App'

interface RecipeViewProps {
    recipe: Recipe
    visuals: Visuals | null
}

export default function RecipeView({ recipe, visuals }: RecipeViewProps) {

    return (
        <div className="recipe-container">
            <CookbookView recipe={recipe} visuals={visuals} viewMode="cookbook" />
        </div>
    )
}
