# Chat Interface for Web Clipper - Product Requirements Document

## Overview
Replace the template-based web clipper interface with an interactive chat interface, allowing users to discuss webpage content with an LLM assistant while maintaining highlight functionality.

## Core Functionality

### 1. Chat Interface

#### Basic Structure
- Replaces the current template-based content field entirely
- Fixed-height chat window with scrollable message history
- Fixed-height input field at bottom
- Send button and loading indicators
- Command+Enter keyboard shortcut for sending messages

#### Message Display
- Assistant messages appear on the left
- User messages appear on the right
- Each assistant message includes:
  * Response content
  * Completion time indicator (using existing LLM integration)
  * Loading state while generating
  * Error state with retry button if failed
  * Success state showing completion time in milliseconds (existing functionality)

#### Highlight Integration
- Utilizes existing highlight selection system
- Maintains current multi-element selection functionality
- Highlight counter appears in message input when highlights are selected
- Format: "{n} highlights" as simple text counter. Should be a modern pill shape with a yellow circle to the left, and "{n} indicators" text on the right
- Counter updates in real-time as highlights are added/removed
- Highlights visible on webpage remain highlighted, as they currently do

### 2. Chat Management

#### Storage & Organization
- Chats organized by webpage URL
- Multiple chats allowed per URL
- Each chat contains:
  * Unique chat ID
  * URL reference
  * Timestamp
  * Message history
  * Associated highlights

#### Chat Navigation
- "View Previous Chats" button in menu. It should be another icon in the sidebar header (next to show page variables, refresh... etc). It should open its own page in the sidebar, just like the 'Show page variables' button does (it has an ellipsis icon.)
- Chat list shows list of cards with:
  * Date/time of chat
  * Preview of first user message
  * Option to delete chat
- Clicking chat loads entire conversation
- New chat button creates fresh conversation

### 3. Page Integration

#### Page Refresh Functionality
- Maintains existing refresh button functionality
- Refresh required when:
  * Changing pages
  * Reloading content
  * Switching between tabs
- Refresh button:
  * Reloads page content
  * Updates chat context
  * Maintains current chat state
  * Reloads highlight markers

#### Highlight Management
- Highlights can be added to messages before sending
- Multiple highlights can be added to single message using existing selection system
- Removing highlight from chat removes it from webpage
- Highlights are stored with chat context

#### Export Format
- Chats export as markdown
- Highlights appear as standard markdown blockquotes
- No special metadata included in export

### 4. Technical Requirements

#### Context Management
- Page metadata included in chat context
- System prompt defined but not user-editable
- Maintain conversation context across messages

#### State Management
- Persist chats across popup opens
- Handle page navigation via existing refresh mechanism
- Maintain separate highlight collections per chat

#### Error Handling
- Show error messages in chat stream
- Provide retry functionality for failed requests
- Basic handling for missing highlights
- Display API errors with retry option

### 5. UI/UX Details

#### Chat Messages
- Clear visual distinction between user/assistant
- Timestamp on messages
- Loading animation during generation
- Error states clearly indicated in red
- Success states show completion time using existing LLM integration

Note that we need to now include multi-turn conversations, where previously it was single turn. Each message to the llm needs to contain the whole conversation, like so:

```
await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [
    {"role": "user", "content": "Hello, Claude"},
    {"role": "assistant", "content": "Hello!"},
    {"role": "user", "content": "Can you describe LLMs to me?"}
  ]
});

```

But keep in mind that we already have a way of managing the LLM instantiation and passing the API key via the settings UI, etc. We can keep that functionality intact but repurpose it. 

#### Navigation
- Clear access to chat history
- Easy creation of new chats
- Simple chat switching


### 6. Migration from Template System

#### Template Replacement
- Complete replacement of template UI with chat interface
- Template selection dropdown removed
- Template configuration options removed from settings
- Existing template code maintained but not exposed in UI

## Future Considerations

### Potential Enhancements
- Auto-expanding input field
- Chat pinning functionality
- Advanced highlight preview features
- Search functionality for chat history
- Enhanced keyboard shortcuts