const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { generateSummaryFromTranscript } = require('./services/aiSummaryFromTranscript');

const testStream = {
  title: 'Test Livestream',
  type: 'sermon',
  preacherNames: ['Pastor John'],
  scriptures: ['John 3:16']
};

const testTranscript = `
[00:00] Pastor John: Good morning everyone. Today we're talking about faith.
[00:30] Faith is believing in God even when we can't see the results.
[01:00] Look at John 3:16 - For God so loved the world...
[02:00] When we have faith, we trust in God's plan.
[03:00] Let's pray together for strength and wisdom.
`;

async function test() {
  try {
    console.log('Testing Google AI Summary...');
    console.log('API Key loaded:', process.env.GOOGLE_API_KEY ? '✅ Yes' : '❌ No');
    const result = await generateSummaryFromTranscript(testStream, testTranscript);
    console.log('✅ Success!');
    console.log('Summary:', result.summary);
    console.log('Key Points:', result.keyPoints);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();