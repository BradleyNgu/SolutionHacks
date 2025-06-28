/**
 * Test script to verify backend setup
 * Run with: node backend/test-setup.js
 */

require('dotenv').config();

async function testBackendSetup() {
  console.log('🧪 Testing Backend Setup...\n');

  // Test 1: Environment Configuration
  console.log('1. Testing Environment Configuration:');
  const requiredEnvVars = ['GEMINI_API_KEY'];
  const optionalEnvVars = ['GCP_PROJECT_ID', 'GCP_KEY_FILENAME'];
  
  let configValid = true;
  
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}: Configured`);
    } else {
      console.log(`   ❌ ${envVar}: Missing (REQUIRED)`);
      configValid = false;
    }
  });
  
  optionalEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}: Configured`);
    } else {
      console.log(`   ⚠️  ${envVar}: Not configured (optional)`);
    }
  });

  if (!configValid) {
    console.log('\n❌ Configuration incomplete. Please check your .env file.');
    console.log('Copy backend/env.template to backend/.env and add your API keys.\n');
    return;
  }

  // Test 2: Service Initialization
  console.log('\n2. Testing Service Initialization:');
  
  try {
    const geminiService = require('./services/geminiService');
    console.log('   ✅ Gemini Service: Initialized');
  } catch (error) {
    console.log(`   ❌ Gemini Service: Failed - ${error.message}`);
    return;
  }

  try {
    const ttsService = require('./services/ttsService');
    console.log('   ✅ TTS Service: Initialized');
  } catch (error) {
    console.log(`   ❌ TTS Service: Failed - ${error.message}`);
  }

  // Test 3: Gemini AI Connection
  console.log('\n3. Testing Gemini AI Connection:');
  
  try {
    const geminiService = require('./services/geminiService');
    const testPrompt = 'Say "Hello" if you can hear me.';
    const response = await geminiService.generateText(testPrompt);
    console.log(`   ✅ Gemini AI: Connected`);
    console.log(`   📝 Test Response: ${response.substring(0, 100)}...`);
  } catch (error) {
    console.log(`   ❌ Gemini AI: Connection failed - ${error.message}`);
  }

  // Test 4: TTS Service
  console.log('\n4. Testing TTS Service:');
  
  try {
    const ttsService = require('./services/ttsService');
    const testText = 'Hello, this is a test.';
    const ttsResult = await ttsService.textToSpeech(testText, { provider: 'web' });
    console.log(`   ✅ TTS Service: Working`);
    console.log(`   🔊 TTS Type: ${ttsResult.type}`);
  } catch (error) {
    console.log(`   ❌ TTS Service: Failed - ${error.message}`);
  }

  // Test 5: Server Dependencies
  console.log('\n5. Testing Server Dependencies:');
  
  const dependencies = ['express', 'cors', 'dotenv'];
  dependencies.forEach(dep => {
    try {
      require(dep);
      console.log(`   ✅ ${dep}: Available`);
    } catch (error) {
      console.log(`   ❌ ${dep}: Missing - run 'npm install'`);
    }
  });

  console.log('\n🎉 Backend setup test completed!');
  console.log('\nNext steps:');
  console.log('1. Start the server: npm run dev');
  console.log('2. Test endpoints at: http://localhost:3001/health');
  console.log('3. Check API documentation in backend/README.md');
}

// Run the test
if (require.main === module) {
  testBackendSetup().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = testBackendSetup; 