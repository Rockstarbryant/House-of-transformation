const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Generate captions and summary from YouTube video
 */
exports.generateCaptionsAndSummary = async (livestream) => {
  try {
    if (!livestream.youtubeVideoId) {
      throw new Error('No YouTube video ID found');
    }

    // Get YouTube captions
    const captions = await getYouTubeCaptions(livestream.youtubeVideoId);
    
    if (!captions || captions.length === 0) {
      throw new Error('No captions available for this video');
    }

    // Format captions with speaker detection
    const formattedCaptions = formatCaptions(captions);

    // Generate summary and key points
    const summary = await generateSummaryFromCaptions(formattedCaptions, livestream);

    return {
      captions: formattedCaptions,
      summary: summary.summary,
      keyPoints: summary.keyPoints
    };
  } catch (error) {
    console.error('Error generating captions:', error);
    throw error;
  }
};

/**
 * Get captions from YouTube using Node package
 */
const getYouTubeCaptions = async (videoId) => {
  try {
    // Using a simple fetch to YouTube API alternative
    const response = await fetch(
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!response.ok) {
      console.warn('Could not fetch YouTube captions, will use placeholder');
      return null;
    }

    const text = await response.text();
    // Parse XML captions
    return parseYouTubeCaptions(text);
  } catch (error) {
    console.error('Error fetching YouTube captions:', error);
    return null;
  }
};

/**
 * Parse YouTube caption XML
 */
const parseYouTubeCaptions = (xmlText) => {
  try {
    // Extract caption texts from XML
    const regex = /<text start="([\d.]+)"[^>]*>(.*?)<\/text>/g;
    const captions = [];
    let match;

    while ((match = regex.exec(xmlText)) !== null) {
      const startTime = parseFloat(match[1]);
      const text = match[2]
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<[^>]*>/g, '');

      captions.push({ startTime, text });
    }

    return captions;
  } catch (error) {
    console.error('Error parsing captions:', error);
    return [];
  }
};

/**
 * Format captions with speaker detection and timestamps
 */
const formatCaptions = (captions) => {
  if (!captions || captions.length === 0) return [];

  const formatted = [];
  let currentSpeaker = 'Speaker 1';
  let speakerCount = 1;
  let lastSpeechTime = 0;

  captions.forEach((caption, index) => {
    // Detect speaker change (silence > 5 seconds or all caps words suggest new speaker)
    if (caption.startTime - lastSpeechTime > 5 || isSpeakerChange(caption.text)) {
      speakerCount++;
      currentSpeaker = `Speaker ${speakerCount}`;
    }

    const time = formatTime(caption.startTime);
    formatted.push({
      timestamp: time,
      speaker: currentSpeaker,
      text: caption.text
    });

    lastSpeechTime = caption.startTime;
  });

  return formatted;
};

/**
 * Detect if speaker likely changed (simple heuristic)
 */
const isSpeakerChange = (text) => {
  // If text starts with common speaker introduction patterns
  const patterns = [
    /^(pastor|reverend|brother|sister|welcome|good morning|hello)/i,
    /^[A-Z ]{4,}:/, // All caps name followed by colon
  ];

  return patterns.some(p => p.test(text));
};

/**
 * Format seconds to MM:SS format
 */
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Generate summary using Claude AI
 */
const generateSummaryFromCaptions = async (captions, livestream) => {
  try {
    // Build caption text for Claude
    const captionText = captions
      .map(c => `[${c.timestamp}] ${c.speaker}: ${c.text}`)
      .join('\n');

    const prompt = `
You are analyzing a church livestream video. Generate a comprehensive summary based on the captions.

LIVESTREAM INFO:
Title: ${livestream.title}
Type: ${livestream.type}
Preachers: ${livestream.preacherNames?.join(', ') || 'Unknown'}
Scriptures: ${livestream.scriptures?.join(', ') || 'None listed'}

CAPTIONS:
${captionText}

Please provide:

1. **Summary** (max 800 words): Summarize the entire sermon/event. Include:
   - Main topic/theme
   - Key messages
   - Bible references discussed
   - Application/takeaways for viewers
   
2. **Key Points** (5-7 bullet points): The most important takeaways

3. **Speaker Segments**: For each speaker identified, provide 1 sentence summary

4. **Skip Silent Sections**: Ignore long pauses or instrumental music

Format your response as JSON:
{
  "summary": "Full summary text here...",
  "keyPoints": ["point 1", "point 2", ...],
  "speakerNotes": {"Speaker 1": "summary...", "Speaker 2": "summary..."}
}
`;

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Could not parse Claude response');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      summary: result.summary.substring(0, 1000), // Enforce 1000 word limit
      keyPoints: result.keyPoints || [],
      speakerNotes: result.speakerNotes || {}
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
};