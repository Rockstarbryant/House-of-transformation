//const Livestream = require('../server/models/livestreamModel');
//const { generateCaptionsAndSummary } = require('../server/services/aiCaptionsService');

/**
 * Run this job when livestream is archived
 * Usage: await processCaptionsForStream(livestreamId)
 */
exports.processCaptionsForStream = async (livestreamId) => {
  try {
    const livestream = await Livestream.findById(livestreamId);
    
    if (!livestream) {
      throw new Error('Livestream not found');
    }

    console.log(`Processing captions for stream: ${livestream.title}`);

    // Generate captions and summary
    const result = await generateCaptionsAndSummary(livestream);

    // Update livestream with results
    livestream.aiSummary = {
      summary: result.summary,
      keyPoints: result.keyPoints,
      speakerNotes: result.speakerNotes,
      captions: result.captions,
      generatedAt: new Date(),
      aiModel: 'claude-3'
    };

    await livestream.save();
    console.log(`Captions generated for: ${livestream.title}`);

    return livestream;
  } catch (error) {
    console.error('Error processing captions:', error);
    throw error;
  }
};