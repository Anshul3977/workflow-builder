import Groq from 'groq-sdk';
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});
const PROMPTS = {
    clean: (text) => `Clean and normalize the following text. Remove extra whitespace, fix formatting, and ensure proper punctuation:

Text: ${text}

Provide only the cleaned text without any explanations.`,
    summarize: (text, config) => {
        const length = config?.length || 'medium';
        const lengthHint = length === 'short'
            ? 'in 2-3 sentences'
            : length === 'long'
                ? 'in 5-7 sentences'
                : 'in 3-4 sentences';
        return `Summarize the following text ${lengthHint}:

Text: ${text}

Provide only the summary without any explanations.`;
    },
    extract: (text, config) => {
        const topics = config?.topics || 'key points';
        return `Extract the ${topics} from the following text. List them as bullet points:

Text: ${text}

Provide only the extracted items as a bullet-point list.`;
    },
    categorize: (text, config) => {
        const categories = config?.categories || 'topic, sentiment, urgency';
        return `Categorize the following text by: ${categories}

Text: ${text}

Provide the categorization in a clear format like:
- Category: value`;
    },
    translate: (text, config) => {
        const targetLanguage = config?.targetLanguage || 'English';
        return `Translate the following text into ${targetLanguage}. Preserve the original meaning and tone as closely as possible:

Text: ${text}

Provide only the translated text without any explanations.`;
    },
    sentiment: (text) => `Analyze the sentiment of the following text. Provide a detailed sentiment analysis including:
- Overall sentiment (positive, negative, neutral, or mixed)
- Confidence level (high, medium, low)
- Key emotional tones detected
- Brief explanation of the sentiment assessment

Text: ${text}

Provide the sentiment analysis in a structured format.`,
};
export async function processStep(input) {
    const startTime = Date.now();
    const prompt = PROMPTS[input.type](input.text, input.config);
    const chatCompletion = await groq.chat.completions.create({
        model: 'mixtral-8x7b-32768',
        max_tokens: 1024,
        messages: [
            {
                role: 'user',
                content: prompt,
            },
        ],
    });
    const processingTime = Date.now() - startTime;
    const result = chatCompletion.choices[0]?.message?.content || '';
    return {
        result,
        processingTime,
        tokensUsed: chatCompletion.usage
            ? {
                input: chatCompletion.usage.prompt_tokens ?? 0,
                output: chatCompletion.usage.completion_tokens ?? 0,
            }
            : undefined,
    };
}
//# sourceMappingURL=groq-client.js.map