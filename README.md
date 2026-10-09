# chatgpt

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.4.2. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Environment variables

Create or update `.env` with:

```env
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile
TAVILY_API_KEY=your-tavily-api-key
```

The Groq agent uses chat-completions tool calling and Tavily for live web search.
