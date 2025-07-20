#!/usr/bin/env node

/**
 * Hacker News API Testing Script
 * 
 * This script tests the HN API integration in a Node.js environment
 * to validate functionality before React Native integration.
 */

const https = require('https');
const { performance } = require('perf_hooks');

// Configuration
const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const STORY_LIMIT = 10;
const REQUEST_TIMEOUT = 5000;

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  performance: {},
};

// Utility functions
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    
    const req = https.get(url, { timeout: REQUEST_TIMEOUT }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        try {
          const parsed = JSON.parse(data);
          resolve({ data: parsed, duration, statusCode: res.statusCode });
        } catch (error) {
          reject(new Error(`JSON parse error: ${error.message}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.on('error', (error) => {
      reject(error);
    });
  });
}

function logSuccess(test, details = '') {
  console.log(`✅ ${test}${details ? ` - ${details}` : ''}`);
  testResults.passed++;
}

function logError(test, error) {
  console.log(`❌ ${test} - ${error.message}`);
  testResults.failed++;
  testResults.errors.push({ test, error: error.message });
}

function formatDuration(ms) {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTimeAgo(unixTime) {
  const now = Date.now();
  const diffMs = now - (unixTime * 1000);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return 'unknown';
  }
}

// Test functions
async function testTopStories() {
  console.log('\n📊 Testing Top Stories Endpoint...');
  
  try {
    const result = await makeRequest(`${HN_API_BASE}/topstories.json`);
    testResults.performance.topStories = result.duration;
    
    if (result.statusCode === 200 && Array.isArray(result.data)) {
      logSuccess('Top stories endpoint', `${result.data.length} stories in ${formatDuration(result.duration)}`);
      
      if (result.data.length >= STORY_LIMIT) {
        logSuccess('Sufficient stories available', `${result.data.length} >= ${STORY_LIMIT}`);
        return result.data.slice(0, STORY_LIMIT);
      } else {
        logError('Insufficient stories', new Error(`Only ${result.data.length} stories available`));
        return result.data;
      }
    } else {
      throw new Error(`Invalid response: ${result.statusCode}`);
    }
  } catch (error) {
    logError('Top stories endpoint', error);
    return [];
  }
}

async function testStoryDetails(storyIds) {
  console.log('\n📄 Testing Story Details...');
  
  const startTime = performance.now();
  const storyPromises = storyIds.map(id => 
    makeRequest(`${HN_API_BASE}/item/${id}.json`)
      .catch(error => ({ error, id }))
  );
  
  const results = await Promise.all(storyPromises);
  const endTime = performance.now();
  const totalDuration = endTime - startTime;
  
  testResults.performance.storyDetails = totalDuration;
  
  const successfulStories = [];
  const failedStories = [];
  
  for (const result of results) {
    if (result.error) {
      failedStories.push(result);
      logError(`Story ${result.id}`, result.error);
    } else if (result.data && result.data.type === 'story') {
      successfulStories.push(result.data);
    }
  }
  
  if (successfulStories.length > 0) {
    logSuccess('Story details fetching', 
      `${successfulStories.length}/${storyIds.length} in ${formatDuration(totalDuration)}`);
  }
  
  if (failedStories.length > 0) {
    logError('Some story details failed', 
      new Error(`${failedStories.length} stories failed to load`));
  }
  
  return successfulStories;
}

async function testInvalidStoryId() {
  console.log('\n🚫 Testing Invalid Story ID...');
  
  try {
    const result = await makeRequest(`${HN_API_BASE}/item/999999999.json`);
    
    if (result.statusCode === 200 && result.data === null) {
      logSuccess('Invalid story ID handling', 'Returns null as expected');
    } else {
      logError('Invalid story ID handling', 
        new Error(`Expected null, got: ${JSON.stringify(result.data)}`));
    }
  } catch (error) {
    logError('Invalid story ID test', error);
  }
}

async function testRateLimit() {
  console.log('\n⏰ Testing Rate Limiting (making 10 rapid requests)...');
  
  const startTime = performance.now();
  const promises = Array.from({ length: 10 }, (_, i) => 
    makeRequest(`${HN_API_BASE}/item/${8863 + i}.json`)
      .catch(error => ({ error }))
  );
  
  const results = await Promise.all(promises);
  const endTime = performance.now();
  const totalDuration = endTime - startTime;
  
  const successful = results.filter(r => !r.error).length;
  const failed = results.filter(r => r.error).length;
  
  logSuccess('Rapid requests test', 
    `${successful} successful, ${failed} failed in ${formatDuration(totalDuration)}`);
  
  const avgResponseTime = totalDuration / results.length;
  if (avgResponseTime < 1000) {
    logSuccess('Response time acceptable', `Average: ${formatDuration(avgResponseTime)}`);
  } else {
    logError('Response time slow', new Error(`Average: ${formatDuration(avgResponseTime)}`));
  }
}

function validateStoryStructure(stories) {
  console.log('\n🔍 Validating Story Data Structure...');
  
  for (const story of stories.slice(0, 3)) { // Check first 3 stories
    const requiredFields = ['id', 'title', 'by', 'time', 'score'];
    const missingFields = requiredFields.filter(field => !(field in story));
    
    if (missingFields.length === 0) {
      logSuccess(`Story ${story.id} structure`, 'All required fields present');
    } else {
      logError(`Story ${story.id} structure`, 
        new Error(`Missing fields: ${missingFields.join(', ')}`));
    }
    
    // Validate field types
    if (typeof story.id === 'number' && typeof story.title === 'string' && 
        typeof story.by === 'string' && typeof story.time === 'number') {
      logSuccess(`Story ${story.id} types`, 'Field types correct');
    } else {
      logError(`Story ${story.id} types`, new Error('Invalid field types'));
    }
  }
}

function displayStoryInformation(stories) {
  console.log('\n📰 Top Stories Summary:');
  console.log('='.repeat(80));
  
  stories.slice(0, 5).forEach((story, index) => {
    const domain = story.url ? extractDomain(story.url) : 'text post';
    const timeAgo = formatTimeAgo(story.time);
    
    console.log(`${index + 1}. ${story.title}`);
    console.log(`   👤 ${story.by} | ⭐ ${story.score} points | 💬 ${story.descendants || 0} comments | ⏰ ${timeAgo}`);
    console.log(`   🌐 ${domain} | 🔗 https://news.ycombinator.com/item?id=${story.id}`);
    if (story.url) {
      console.log(`   📄 ${story.url}`);
    }
    console.log('');
  });
}

function displayPerformanceReport() {
  console.log('\n⚡ Performance Report:');
  console.log('='.repeat(50));
  
  if (testResults.performance.topStories) {
    console.log(`📊 Top Stories List: ${formatDuration(testResults.performance.topStories)}`);
  }
  
  if (testResults.performance.storyDetails) {
    console.log(`📄 Story Details (${STORY_LIMIT} stories): ${formatDuration(testResults.performance.storyDetails)}`);
    const avgPerStory = testResults.performance.storyDetails / STORY_LIMIT;
    console.log(`📄 Average per story: ${formatDuration(avgPerStory)}`);
  }
}

function displayTestSummary() {
  console.log('\n📋 Test Summary:');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n🚨 Errors:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`   • ${test}: ${error}`);
    });
  }
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! HN API integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Main execution
async function main() {
  console.log('🚀 Hacker News API Integration Test');
  console.log('='.repeat(50));
  console.log(`Testing with ${STORY_LIMIT} stories and ${REQUEST_TIMEOUT}ms timeout\n`);
  
  try {
    // Test basic endpoints
    const storyIds = await testTopStories();
    
    if (storyIds.length > 0) {
      const stories = await testStoryDetails(storyIds);
      
      if (stories.length > 0) {
        validateStoryStructure(stories);
        displayStoryInformation(stories);
      }
    }
    
    // Test error handling
    await testInvalidStoryId();
    
    // Test performance under load
    await testRateLimit();
    
    // Display reports
    displayPerformanceReport();
    displayTestSummary();
    
  } catch (error) {
    console.error('\n💥 Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the tests
main().catch(console.error);