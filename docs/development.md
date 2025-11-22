# Development Guidelines

This document outlines development practices, coding standards, and Cursor-specific rules for the Recipe Extract project.

## Table of Contents

- [Code Organization](#code-organization)
- [AI Prompt Management](#ai-prompt-management)
- [Testing](#testing)
- [Contributing](#contributing)

## Code Organization

### Project Structure

```
recipe_extract/
├── backend/
│   ├── prompts/           # AI prompt templates
│   │   ├── __init__.py
│   │   ├── recipe_extraction.py
│   │   └── timestamp_extraction.py
│   ├── services.py        # Main business logic
│   ├── main.py           # FastAPI application
│   └── cache_manager.py  # Caching utilities
├── frontend/
│   └── src/components/   # React components
└── docs/                 # Documentation
```

### File Naming

- Use `snake_case` for Python files and functions
- Use `PascalCase` for React components
- Use `kebab-case` for configuration files

## AI Prompt Management

### Cursor Rule: External Prompt Storage

**ALL AI prompts must be stored in external files and imported where needed.**

This project follows a strict policy for managing AI prompts to ensure maintainability, reusability, and proper version control.

### Implementation Pattern

1. **Create prompt files** in `backend/prompts/`:
   ```python
   # backend/prompts/example_prompt.py
   EXAMPLE_PROMPT = """
   Your prompt template here...
   {variable_placeholder}
   """
   ```

2. **Import and use prompts** in service files:
   ```python
   # backend/services.py
   from prompts import example_prompt

   def some_function(input_data):
       prompt = example_prompt.EXAMPLE_PROMPT.format(
           variable_placeholder=input_data
       )
       # Use the prompt...
   ```

### Benefits

- **Version Control**: Prompts are tracked as separate files with clear change history
- **Reusability**: Prompts can be imported and used across multiple functions
- **Maintainability**: Large prompt strings don't clutter business logic
- **Testing**: Prompts can be easily mocked or modified for testing
- **Collaboration**: Clear separation makes prompt updates easier to review

### When Adding New AI Prompts

1. Create a new file in `backend/prompts/`
2. Define the prompt as a constant string variable
3. Add proper imports in `__init__.py` if needed
4. Import and use the prompt in your service function
5. Update this documentation if adding new prompt types

### Existing Prompts

- `recipe_extraction.py` - Recipe extraction from YouTube videos
- `timestamp_extraction.py` - Visual timestamp identification for key steps

### Prohibited Practices

❌ **DO NOT** include prompts directly in service functions:
```python
# WRONG - Don't do this
def extract_recipe(input_data):
    prompt = f"""
    Large prompt string here...
    {input_data}
    """
```

✅ **DO** use external prompt files:
```python
# CORRECT - Do this instead
from prompts import recipe_extraction

def extract_recipe(input_data):
    prompt = recipe_extraction.RECIPE_EXTRACTION_PROMPT.format(input_data=input_data)
```

## Testing

### Backend Testing

Run backend tests:
```bash
cd backend
python -m pytest
```

### Frontend Testing

Run frontend tests:
```bash
cd frontend
npm test
```

## Contributing

### Pull Request Guidelines

1. Ensure all tests pass
2. Update documentation for any changes
3. Follow the established code patterns
4. Test thoroughly before submitting

### Code Review Checklist

- [ ] No inline AI prompts (use external files)
- [ ] Proper error handling
- [ ] Tests included for new features
- [ ] Documentation updated
- [ ] Code follows established patterns
