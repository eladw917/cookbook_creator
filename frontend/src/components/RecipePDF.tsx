import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

// Using system fonts - React-PDF supports Helvetica, Times-Roman, Courier
// We'll use Helvetica (similar to Open Sans) and Times-Roman (similar to Libre Baskerville)

// Create styles matching the HTML template
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: 'white',
  },
  
  // Hero Page Styles
  heroPage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  heroImage: {
    width: '100%',
    height: '60%',
    objectFit: 'cover',
  },
  heroContent: {
    padding: '40px 60px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontFamily: 'Times-Roman',
    fontSize: 48,
    fontWeight: 'bold',
    lineHeight: 1.2,
    marginBottom: 20,
    color: '#1a1a1a',
  },
  heroDescription: {
    fontSize: 16,
    lineHeight: 1.8,
    color: '#555',
    marginBottom: 'auto',
  },
  timeBadges: {
    display: 'flex',
    flexDirection: 'row',
    gap: 40,
    marginTop: 30,
  },
  timeBadge: {
    textAlign: 'center',
  },
  timeBadgeLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#888',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  timeBadgeValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  
  // Content Page Styles
  contentPage: {
    padding: '50px 40px',
    display: 'flex',
    flexDirection: 'row',
    gap: 30,
  },
  ingredientsColumn: {
    width: '30%',
    padding: 20,
    backgroundColor: '#f5d5c8',
  },
  ingredientsColumnWide: {
    width: '40%',
    padding: 20,
    backgroundColor: '#f5d5c8',
  },
  instructionsColumn: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: 'Times-Roman',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottom: '2px solid #1a1a1a',
    textTransform: 'capitalize',
  },
  servingsInfo: {
    fontSize: 11,
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ingredientsList: {
    marginBottom: 8,
  },
  ingredientItem: {
    fontSize: 12,
    lineHeight: 1.4,
    marginBottom: 3,
    color: '#333',
  },
  ingredientSubheader: {
    fontFamily: 'Times-Roman',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 4,
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  instructionsList: {
    paddingLeft: 20,
  },
  instructionItem: {
    marginBottom: 8,
    paddingLeft: 5,
  },
  instructionText: {
    fontSize: 13,
    lineHeight: 1.5,
    color: '#333',
  },
  stepImage: {
    width: '100%',
    marginTop: 10,
    borderRadius: 8,
  },
  overflowIngredientsContainer: {
    backgroundColor: '#f5d5c8',
    padding: 15,
    marginBottom: 20,
  },
  
  // Overflow Page Styles
  overflowPage: {
    padding: '80px 40px 50px 40px',
  },
});

interface Ingredient {
  quantity: string;
  unit: string;
  ingredient: string;
  purpose?: string;
}

interface Instruction {
  step_number: number;
  instruction: string;
  is_key_step?: boolean;
}

interface RecipeData {
  title: string;
  description: string;
  prep_time: string;
  cook_time: string;
  total_time: string;
  servings: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  hero_image?: string;
  step_images?: { [key: string]: string };
}

interface RecipePDFProps {
  recipe: RecipeData;
  splitData?: {
    left_column_ingredients: number[];
    right_column_ingredients: number[];
    first_page_instructions: number[];
    overflow_instructions: number[];
    ingredients_overflow: boolean;
  };
}

export const RecipePDF = ({ recipe, splitData }: RecipePDFProps) => {
  // Group ingredients by purpose
  const groupIngredients = (ingredients: Ingredient[]) => {
    const groups: { [key: string]: Ingredient[] } = {};
    ingredients.forEach((ing) => {
      const purpose = ing.purpose || 'cooking';
      if (!groups[purpose]) {
        groups[purpose] = [];
      }
      groups[purpose].push(ing);
    });
    return groups;
  };

  // Determine splits
  const leftIngredients = splitData
    ? splitData.left_column_ingredients.map((idx) => recipe.ingredients[idx])
    : recipe.ingredients;
  
  const rightIngredients = splitData
    ? splitData.right_column_ingredients.map((idx) => recipe.ingredients[idx])
    : [];
  
  const firstPageSteps = splitData
    ? splitData.first_page_instructions.map((idx) => recipe.instructions[idx])
    : recipe.instructions;
  
  const overflowSteps = splitData
    ? splitData.overflow_instructions.map((idx) => recipe.instructions[idx])
    : [];
  
  const hasRightIngredients = splitData?.ingredients_overflow || false;

  const leftGroups = groupIngredients(leftIngredients);
  const rightGroups = groupIngredients(rightIngredients);

  return (
    <Document>
      {/* Page 1: Hero */}
      <Page size="A4" style={styles.page}>
        <View style={styles.heroPage}>
          {recipe.hero_image && (
            <Image src={recipe.hero_image} style={styles.heroImage} />
          )}
          <View style={styles.heroContent}>
            <View>
              <Text style={styles.heroTitle}>{recipe.title}</Text>
              <Text style={styles.heroDescription}>{recipe.description}</Text>
            </View>
            <View style={styles.timeBadges}>
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeLabel}>PREP</Text>
                <Text style={styles.timeBadgeValue}>{recipe.prep_time}</Text>
              </View>
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeLabel}>COOK</Text>
                <Text style={styles.timeBadgeValue}>{recipe.cook_time}</Text>
              </View>
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeLabel}>TOTAL</Text>
                <Text style={styles.timeBadgeValue}>{recipe.total_time}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>

      {/* Page 2: Content with Two Columns */}
      <Page size="A4" style={styles.page}>
        <View style={styles.contentPage}>
          {/* Left Column: Ingredients */}
          <View style={hasRightIngredients ? styles.ingredientsColumnWide : styles.ingredientsColumn}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <Text style={styles.servingsInfo}>{recipe.servings}</Text>

            {/* Display "cooking" purpose ingredients first without subheader */}
            {leftGroups.cooking && (
              <View style={styles.ingredientsList}>
                {leftGroups.cooking.map((ing, idx) => (
                  <Text key={idx} style={styles.ingredientItem}>
                    {ing.quantity !== '-' && `${ing.quantity} `}
                    {ing.unit !== '-' && `${ing.unit} `}
                    {ing.ingredient}
                  </Text>
                ))}
              </View>
            )}

            {/* Display other purposes with subheaders */}
            {Object.entries(leftGroups).map(([purpose, ingredients]) => {
              if (purpose === 'cooking') return null;
              return (
                <View key={purpose}>
                  <Text style={styles.ingredientSubheader}>
                    {purpose.charAt(0).toUpperCase() + purpose.slice(1)}
                  </Text>
                  <View style={styles.ingredientsList}>
                    {ingredients.map((ing, idx) => (
                      <Text key={idx} style={styles.ingredientItem}>
                        {ing.quantity !== '-' && `${ing.quantity} `}
                        {ing.unit !== '-' && `${ing.unit} `}
                        {ing.ingredient}
                      </Text>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Right Column: Overflow Ingredients (if any) + Instructions */}
          <View style={styles.instructionsColumn}>
            {/* Overflow ingredients */}
            {hasRightIngredients && rightIngredients.length > 0 && (
              <View style={styles.overflowIngredientsContainer}>
                <Text style={styles.sectionTitle}>Ingredients (continued)</Text>
                
                {rightGroups.cooking && (
                  <View style={styles.ingredientsList}>
                    {rightGroups.cooking.map((ing, idx) => (
                      <Text key={idx} style={styles.ingredientItem}>
                        {ing.quantity !== '-' && `${ing.quantity} `}
                        {ing.unit !== '-' && `${ing.unit} `}
                        {ing.ingredient}
                      </Text>
                    ))}
                  </View>
                )}

                {Object.entries(rightGroups).map(([purpose, ingredients]) => {
                  if (purpose === 'cooking') return null;
                  return (
                    <View key={purpose}>
                      <Text style={styles.ingredientSubheader}>
                        {purpose.charAt(0).toUpperCase() + purpose.slice(1)}
                      </Text>
                      <View style={styles.ingredientsList}>
                        {ingredients.map((ing, idx) => (
                          <Text key={idx} style={styles.ingredientItem}>
                            {ing.quantity !== '-' && `${ing.quantity} `}
                            {ing.unit !== '-' && `${ing.unit} `}
                            {ing.ingredient}
                          </Text>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Instructions */}
            <Text style={styles.sectionTitle}>Instructions</Text>
            <View style={styles.instructionsList}>
              {firstPageSteps.map((instruction, idx) => (
                <View key={idx} style={styles.instructionItem}>
                  <Text style={styles.instructionText}>
                    • {instruction.instruction}
                  </Text>
                  {recipe.step_images && recipe.step_images[instruction.step_number.toString()] && (
                    <Image
                      src={recipe.step_images[instruction.step_number.toString()]}
                      style={styles.stepImage}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>
      </Page>

      {/* Overflow Pages: Full Width Instructions */}
      {overflowSteps.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.overflowPage}>
            <Text style={styles.sectionTitle}>Instructions (continued)</Text>
            <View style={styles.instructionsList}>
              {overflowSteps.map((instruction, idx) => (
                <View key={idx} style={styles.instructionItem}>
                  <Text style={styles.instructionText}>
                    • {instruction.instruction}
                  </Text>
                  {recipe.step_images && recipe.step_images[instruction.step_number.toString()] && (
                    <Image
                      src={recipe.step_images[instruction.step_number.toString()]}
                      style={styles.stepImage}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>
        </Page>
      )}
    </Document>
  );
};

