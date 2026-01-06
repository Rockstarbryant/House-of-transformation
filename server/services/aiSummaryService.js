// services/aiSummaryService.js
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Generate AI summary for a livestream
 * Call this after stream ends with transcript/notes
 */
const generateLiveStreamSummary = async (livestream) => {
  try {
    const prompt = `
You are analyzing a church livestream recording. Based on the following information, provide a concise summary and key points:

Title: ${livestream.title}
Type: ${livestream.type}
Preacher(s): ${livestream.preacherNames.join(', ') || 'Not specified'}
Scriptures Referenced: ${livestream.scriptures.join(', ') || 'None listed'}
Duration: ${livestream.duration ? Math.round(livestream.duration / 60) + ' minutes' : 'Unknown'}
Description: ${livestream.description || 'No description provided'}

Please provide:
1. A 2-3 sentence summary of the livestream content
2. 3-5 key takeaways or main points
3. Spiritual/practical applications for viewers

Format as JSON:
{
  "summary": "...",
  "keyPoints": ["point1", "point2", "point3"]
}`;

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = message.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating summary:', error);
    return {
      summary: 'Summary generation pending',
      keyPoints: []
    };
  }
};

/**
 * Generate search-optimized tags from livestream content
 */
const generateTags = async (livestream) => {
  try {
    const prompt = `Generate 5-8 relevant tags/keywords for this church livestream:
Title: ${livestream.title}
Type: ${livestream.type}
Scriptures: ${livestream.scriptures.join(', ')}
Description: ${livestream.description}

Return as JSON array: ["tag1", "tag2", ...]`;

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = message.content[0].text;
    const match = content.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch (error) {
    console.error('Error generating tags:', error);
    return [];
  }
};

module.exports = {
  generateLiveStreamSummary,
  generateTags
};