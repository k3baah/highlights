# Obsidian Web Clipper Interpreter System

This document details the architecture and functionality of the Interpreter system in the Obsidian Web Clipper extension. The system enables AI-powered content processing through various language models before saving to Obsidian.

## Overview

The Interpreter system allows users to:
- Process webpage content through AI models
- Extract specific information
- Transform content (summarize, translate, etc.)
- Integrate AI responses into templates

### Key Components

1. **Template System**: Defines how content is processed and formatted
2. **Provider System**: Manages connections to AI services
3. **Filter System**: Processes content before and after AI interaction
4. **UI Components**: Manages user interaction and feedback

## Technical Architecture

### Templates and Variables

Templates use a special syntax for AI prompts:
```typescript
// Simple prompt
{{"summarize this content"}}

// Prompt with filters
{{"extract key points"|list}}

// Context-specific prompt
{{"translate to French"|blockquote}}
```

The system collects prompts through `collectPromptVariables()`:
```typescript
export function collectPromptVariables(template: Template | null): PromptVariable[] {
    const promptMap = new Map<string, PromptVariable>();
    const promptRegex = /{{(?:prompt:)?"(.*?)"(\|.*?)?}}/g;
    // Scans template content and properties for prompts
}
```

### Providers and Models

The system supports multiple AI providers:

```typescript
const PRESET_PROVIDERS = {
    anthropic: {
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1/messages'
    },
    openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1/chat/completions'
    },
    // Additional providers...
}
```

Each provider can have multiple models:
```typescript
interface ModelConfig {
    id: string;
    providerId: string;
    providerModelId: string;
    name: string;
    enabled: boolean;
}
```

### Filter System

Filters transform content before and after AI processing:
```typescript
export const filters: { [key: string]: FilterFunction } = {
    blockquote,   // Wraps in blockquote
    markdown,     // Converts to markdown
    list,        // Creates bullet points
    // Many more filters...
}
```

## Configuration

### Provider Setup

1. Access Settings → Interpreter
2. Add a provider:
   ```typescript
   interface Provider {
       id: string;
       name: string;
       baseUrl: string;
       apiKey: string;
   }
   ```
3. Configure API key and base URL

### Model Configuration

1. Add models to providers:
   - Select provider
   - Configure model ID
   - Set display name
   - Enable/disable as needed

### Template Settings

Templates can specify:
```typescript
interface Template {
    context?: string;          // AI context
    noteContentFormat: string; // Can include prompts
    properties: Property[];    // Can include prompts
}
```

## Usage Flow

### 1. Template Creation

1. Create template with AI prompts:
```markdown
# {{title}}

Summary: {{"summarize this content in 3 bullet points"}}

Translation: {{"translate to Spanish"|blockquote}}

Tags: {{"suggest 5 tags based on content"|join:", "}}
```

### 2. Processing Flow

When "Interpret" is clicked:

```typescript
export async function handleInterpreterUI(
    template: Template,
    variables: { [key: string]: string },
    tabId: number,
    currentUrl: string,
    modelConfig: ModelConfig
): Promise<void> {
    // 1. Collect prompts
    const promptVariables = collectPromptVariables(template);

    // 2. Get context
    const contextToUse = promptContextTextarea.value;

    // 3. Process through LLM
    const { promptResponses } = await sendToLLM(
        contextToUse,
        contentToProcess,
        promptVariables,
        modelConfig
    );

    // 4. Update template with responses
    replacePromptVariables(promptVariables, promptResponses);
}
```

### 3. Response Handling

1. LLM responses are processed through filters
2. Variables are updated in the template
3. UI feedback shows progress and completion
4. Content is ready for saving to Obsidian

## Error Handling

The system includes robust error handling:
- Rate limiting protection
- API error handling
- User feedback through UI
- Graceful fallbacks

## Best Practices

1. **Context Management**
   - Use specific context to reduce tokens
   - Apply filters to clean content
   - Use template context settings

2. **Prompt Design**
   - Be specific in prompts
   - Use appropriate filters
   - Consider token limits

3. **Provider Selection**
   - Choose appropriate models for tasks
   - Consider rate limits
   - Balance speed vs capability

## Content Flow

The system processes webpage content through several steps:

### 1. Content Extraction
Content is initially extracted by the content script (`content.ts`), which sends a `getPageContent` response containing:
```typescript
interface ContentResponse {
    content: string;           // Full page HTML
    selectedHtml: string;      // User-selected text if any
    extractedContent: object;  // Extracted metadata
    schemaOrgData: any;       // Schema.org structured data
    fullHtml: string;         // Cleaned HTML without scripts/styles
    highlights: string[];     // User highlights
}
```

### 2. Interpreter Triggering
The interpreter can be triggered in two ways:
```typescript
// Auto-run when enabled
if (generalSettings.interpreterAutoRun && promptVariables.length > 0) {
    await handleInterpreterUI(template, variables, tabId, currentUrl, modelConfig);
}

// Manual trigger via interpret button
interpretBtn.addEventListener('click', async () => {
    await handleInterpreterUI(template, variables, tabId, currentUrl, modelConfig);
});
```

### 3. Content Processing
`handleInterpreterUI` orchestrates the LLM interaction:
```typescript
const contextToUse = promptContextTextarea.value;     // System prompt
const contentToProcess = variables.content || '';     // Page content

const { promptResponses } = await sendToLLM(
    contextToUse,          
    contentToProcess,      
    promptVariables,       
    modelConfig           
);
```

This creates a pipeline where:
1. Content script extracts webpage content
2. Template system collects AI prompts
3. `handleInterpreterUI` manages the LLM interaction
4. Responses are integrated back into the template

## Conclusion

The Interpreter system provides a powerful way to process web content through AI before saving to Obsidian. Its modular design allows for:
- Multiple AI providers
- Custom processing pipelines
- Flexible template integration
- Efficient content transformation