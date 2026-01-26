const fetch = require('node-fetch');

/**
 * Extract transcript from YouTube video
 */
const extractYouTubeTranscript = async (videoId) => {
  try {
    // Using youtube-transcript-api alternative via fetch
    const response = await fetch(
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!response.ok) {
      console.warn(`YouTube captions not available for ${videoId}`);
      return null;
    }

    const xmlText = await response.text();
    const captions = parseYouTubeXML(xmlText);
    
    if (!captions || captions.length === 0) {
      return null;
    }

    // Format as readable transcript
    return formatTranscript(captions);
  } catch (error) {
    console.error('Error extracting YouTube transcript:', error.message);
    return null;
  }
};

/**
 * Parse YouTube XML captions
 */
const parseYouTubeXML = (xmlText) => {
  try {
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
        .replace(/<[^>]*>/g, '')
        .trim();

      if (text) {
        captions.push({ startTime, text });
      }
    }

    return captions;
  } catch (error) {
    console.error('Error parsing YouTube XML:', error);
    return [];
  }
};

/**
 * Extract transcript from Facebook Live video
 */
const extractFacebookTranscript = async (facebookUrl) => {
  try {
    // Facebook doesn't provide easy transcript access
    // Return null - user should manually provide or use YouTube
    console.warn('Facebook transcript extraction not available. Admin must provide manually.');
    return null;
  } catch (error) {
    console.error('Error extracting Facebook transcript:', error.message);
    return null;
  }
};

/**
 * Format captions into readable transcript
 */
const formatTranscript = (captions) => {
  if (!captions || captions.length === 0) return '';

  return captions
    .map(caption => {
      const time = formatTime(caption.startTime);
      return `[${time}] ${caption.text}`;
    })
    .join('\n');
};

/**
 * Format seconds to MM:SS
 */
const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Clean and validate transcript text
 */
const cleanTranscript = (text) => {
  if (!text || typeof text !== 'string') return '';

  return text
    .trim()
    .replace(/\s+/g, ' ') // Remove extra whitespace
    .substring(0, 50000); // Max 50k chars
};

/**
 * Validate transcript before saving
 */
const validateTranscript = (transcript) => {
  if (!transcript || transcript.trim().length === 0) {
    return { valid: false, error: 'Transcript cannot be empty' };
  }
  if (transcript.length > 50000) {
    return { valid: false, error: 'Transcript too long (max 50,000 characters)' };
  }
  return { valid: true };
};

module.exports = {
  extractYouTubeTranscript,
  extractFacebookTranscript,
  formatTranscript,
  cleanTranscript,
  validateTranscript
};