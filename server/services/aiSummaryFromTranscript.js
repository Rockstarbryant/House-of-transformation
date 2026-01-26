const https = require('https');

// Using Hugging Face free serverless inference API
const HF_API_KEY = process.env.HUGGING_FACE_API_KEY;

/**
 * Make request to Hugging Face Serverless Inference API
 */
const queryHuggingFace = (prompt) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      inputs: prompt
    });

    const options = {
      hostname: 'api-inference.huggingface.co',
      path: '/models/mistralai/Mistral-7B-Instruct-v0.2',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      console.log('HF Response Status:', res.statusCode);
      let response = '';

      res.on('data', (chunk) => {
        response += chunk;
      });

      res.on('end', () => {
        try {
          console.log('Raw HF Response:', response.substring(0, 200));
          const parsed = JSON.parse(response);
          
          if (parsed.error) {
            reject(new Error(`Hugging Face API Error: ${parsed.error}`));
          }
          
          if (Array.isArray(parsed) && parsed[0]?.generated_text) {
            resolve(parsed[0].generated_text);
          } else if (parsed.generated_text) {
            resolve(parsed.generated_text);
          } else {
            console.error('Unexpected response format:', JSON.stringify(parsed, null, 2));
            reject(new Error('Unexpected response format from Hugging Face'));
          }
        } catch (error) {
          console.error('Parse error. Raw response:', response);
          reject(new Error(`Failed to parse Hugging Face response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Connection to Hugging Face failed: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
};

/**
 * Generate summary from cleaned transcript using Hugging Face
 */
const generateSummaryFromTranscript = async (livestream, transcript) => {
  try {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Transcript is empty');
    }

    if (!HF_API_KEY) {
      throw new Error('HUGGING_FACE_API_KEY not found in .env file');
    }

    const prompt = `You are analyzing a church livestream transcript. Generate ONLY valid JSON (no other text):

LIVESTREAM INFO:
Title: ${livestream.title}
Type: ${livestream.type}
Preacher(s): ${livestream.preacherNames?.join(', ') || 'Unknown'}
Scriptures Referenced: ${livestream.scriptures?.join(', ') || 'None listed'}

TRANSCRIPT:
${transcript.substring(0, 1500)}

Return ONLY this JSON format:
{
  "summary": "100-150 word summary of the message",
  "keyPoints": ["point1", "point2", "point3", "point4", "point5"],
  "scripturesFocused": ["scripture1", "scripture2"]
}`;

    console.log('Querying Hugging Face API for summary...');
    const responseText = await queryHuggingFace(prompt);

    console.log('Hugging Face Response (first 300 chars):', responseText.substring(0, 300));

    // Parse JSON response
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Could not parse response as JSON:', responseText.substring(0, 500));
        // Return fallback response if parsing fails
        result = {
          summary: responseText.substring(0, 500),
          keyPoints: ['Message has been recorded'],
          scripturesFocused: livestream.scriptures || []
        };
      } else {
        result = JSON.parse(jsonMatch[0]);
      }
    }

    return {
      summary: result.summary ? result.summary.substring(0, 2000) : '',
      keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints.slice(0, 10) : [],
      scripturesFocused: Array.isArray(result.scripturesFocused) ? result.scripturesFocused : [],
      generatedAt: new Date(),
      aiModel: 'mistral-7b-huggingface'
    };
  } catch (error) {
    console.error('Error generating summary from transcript:', error.message);
    throw error;
  }
};

/**
 * Generate tags from transcript content
 */
const generateTagsFromTranscript = async (livestream, transcript) => {
  try {
    const prompt = `Generate 5-8 relevant tags for this church livestream. Return ONLY JSON array:

Title: ${livestream.title}
Type: ${livestream.type}
Scriptures: ${livestream.scriptures?.join(', ') || 'None'}

["tag1", "tag2", "tag3", "tag4", "tag5"]`;

    const responseText = await queryHuggingFace(prompt);

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      const match = responseText.match(/\[[\s\S]*\]/);
      return match ? JSON.parse(match[0]) : [];
    }
  } catch (error) {
    console.error('Error generating tags:', error.message);
    return [];
  }
};

module.exports = {
  generateSummaryFromTranscript,
  generateTagsFromTranscript
};