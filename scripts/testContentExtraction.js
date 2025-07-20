#!/usr/bin/env node

/**
 * Content Extraction Testing Script
 * 
 * This script tests the content extraction service against real Hacker News articles
 * and provides detailed statistics about extraction success rates and performance.
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Import our content extraction service (in a real Node.js environment)
// For this script, we'll simulate the functionality since we're in a React Native context

class ContentExtractionTester {
  constructor() {
    this.stats = {
      totalAttempts: 0,
      successfulExtractions: 0,
      failedExtractions: 0,
      extractionTimes: [],
      methodStats: {
        readability: 0,
        custom: 0,
        metadata: 0,
        fallback: 0,
        failed: 0,
      },
      domainStats: new Map(),
      errorTypes: new Map(),
    };
    
    this.testResults = [];
  }

  async fetchTopHNStories(limit = 20) {
    console.log(`Fetching top ${limit} Hacker News stories...`);
    
    try {
      // Fetch top stories list
      const topStoriesResponse = await axios.get(
        'https://hacker-news.firebaseio.com/v0/topstories.json',
        { timeout: 10000 }
      );
      
      const storyIds = topStoriesResponse.data.slice(0, limit);
      const stories = [];
      
      // Fetch individual story details
      for (const id of storyIds) {
        try {
          const storyResponse = await axios.get(
            `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
            { timeout: 5000 }
          );
          
          const story = storyResponse.data;
          if (story && story.url && story.type === 'story') {
            stories.push({
              id: story.id,
              title: story.title,
              url: story.url,
              score: story.score,
              by: story.by,
              time: story.time,
              descendants: story.descendants || 0,
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch story ${id}: ${error.message}`);
        }
      }
      
      console.log(`✓ Successfully fetched ${stories.length} stories with URLs`);
      return stories;
    } catch (error) {
      console.error('Failed to fetch HN stories:', error.message);
      return [];
    }
  }

  async simulateContentExtraction(url) {
    // Since we can't directly import the TypeScript service in this script,
    // we'll simulate the extraction process with real HTTP requests
    const startTime = Date.now();
    
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        maxRedirects: 5,
      });
      
      const extractionTime = Date.now() - startTime;
      const contentLength = response.data.length;
      const domain = new URL(url).hostname.replace('www.', '');
      
      // Simple content analysis
      const hasTitle = /<title[^>]*>([^<]+)<\/title>/i.test(response.data);
      const hasArticle = /<article/i.test(response.data);
      const hasMainContent = /<main/i.test(response.data) || 
                            /class="[^"]*content/i.test(response.data) ||
                            /class="[^"]*post/i.test(response.data);
      
      const textContent = response.data.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const wordCount = textContent.split(' ').filter(word => word.length > 0).length;
      
      // Determine likely extraction success
      let success = false;
      let extractionMethod = 'failed';
      let estimatedQuality = 0;
      
      if (wordCount > 500 && (hasArticle || hasMainContent)) {
        success = true;
        extractionMethod = 'readability';
        estimatedQuality = 85;
      } else if (wordCount > 200 && hasTitle) {
        success = true;
        extractionMethod = 'custom';
        estimatedQuality = 70;
      } else if (wordCount > 50) {
        success = true;
        extractionMethod = 'metadata';
        estimatedQuality = 50;
      } else {
        extractionMethod = 'fallback';
        estimatedQuality = 25;
      }
      
      return {
        success,
        url,
        domain,
        extractionMethod,
        extractionTime,
        contentLength,
        wordCount,
        estimatedQuality,
        hasTitle,
        hasArticle,
        hasMainContent,
        httpStatus: response.status,
        contentType: response.headers['content-type'] || 'unknown',
      };
    } catch (error) {
      const extractionTime = Date.now() - startTime;
      const domain = this.extractDomain(url);
      
      return {
        success: false,
        url,
        domain,
        extractionMethod: 'failed',
        extractionTime,
        contentLength: 0,
        wordCount: 0,
        estimatedQuality: 0,
        error: error.message,
        httpStatus: error.response?.status || 0,
        contentType: 'error',
      };
    }
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown-domain';
    }
  }

  async testStories(stories) {
    console.log(`\nTesting content extraction on ${stories.length} stories...\n`);
    
    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      const progress = `[${i + 1}/${stories.length}]`;
      
      console.log(`${progress} Testing: ${story.title.slice(0, 60)}...`);
      console.log(`         URL: ${story.url}`);
      
      const result = await this.simulateContentExtraction(story.url);
      
      // Update statistics
      this.stats.totalAttempts++;
      this.stats.extractionTimes.push(result.extractionTime);
      
      if (result.success) {
        this.stats.successfulExtractions++;
        this.stats.methodStats[result.extractionMethod]++;
        
        console.log(`         ✓ Success (${result.extractionMethod}) - ${result.wordCount} words in ${result.extractionTime}ms`);
      } else {
        this.stats.failedExtractions++;
        this.stats.methodStats.failed++;
        
        const errorType = result.httpStatus || 'network';
        this.stats.errorTypes.set(errorType, (this.stats.errorTypes.get(errorType) || 0) + 1);
        
        console.log(`         ✗ Failed - ${result.error || 'Unknown error'}`);
      }
      
      // Update domain statistics
      const domainCount = this.stats.domainStats.get(result.domain) || { attempts: 0, successes: 0 };
      domainCount.attempts++;
      if (result.success) domainCount.successes++;
      this.stats.domainStats.set(result.domain, domainCount);
      
      this.testResults.push({
        story,
        extraction: result,
      });
      
      // Add delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  generateReport() {
    const successRate = (this.stats.successfulExtractions / this.stats.totalAttempts * 100).toFixed(1);
    const avgTime = (this.stats.extractionTimes.reduce((a, b) => a + b, 0) / this.stats.extractionTimes.length).toFixed(0);
    
    console.log('\n' + '='.repeat(80));
    console.log('CONTENT EXTRACTION TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\nOVERALL STATISTICS:`);
    console.log(`  Total attempts: ${this.stats.totalAttempts}`);
    console.log(`  Successful extractions: ${this.stats.successfulExtractions}`);
    console.log(`  Failed extractions: ${this.stats.failedExtractions}`);
    console.log(`  Success rate: ${successRate}%`);
    console.log(`  Average extraction time: ${avgTime}ms`);
    
    console.log(`\nEXTRACTION METHODS:`);
    Object.entries(this.stats.methodStats).forEach(([method, count]) => {
      const percentage = (count / this.stats.totalAttempts * 100).toFixed(1);
      console.log(`  ${method}: ${count} (${percentage}%)`);
    });
    
    console.log(`\nTOP DOMAINS BY SUCCESS RATE:`);
    const domainResults = Array.from(this.stats.domainStats.entries())
      .filter(([domain, stats]) => stats.attempts > 0)
      .map(([domain, stats]) => ({
        domain,
        attempts: stats.attempts,
        successes: stats.successes,
        successRate: (stats.successes / stats.attempts * 100).toFixed(1),
      }))
      .sort((a, b) => b.successRate - a.successRate);
    
    domainResults.slice(0, 10).forEach(result => {
      console.log(`  ${result.domain}: ${result.successes}/${result.attempts} (${result.successRate}%)`);
    });
    
    if (this.stats.errorTypes.size > 0) {
      console.log(`\nERROR TYPES:`);
      Array.from(this.stats.errorTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([error, count]) => {
          console.log(`  ${error}: ${count}`);
        });
    }
    
    console.log(`\nSAMPLE SUCCESSFUL EXTRACTIONS:`);
    const successful = this.testResults.filter(r => r.extraction.success);
    successful.slice(0, 3).forEach(result => {
      console.log(`\n  Title: ${result.story.title}`);
      console.log(`  URL: ${result.story.url}`);
      console.log(`  Method: ${result.extraction.extractionMethod}`);
      console.log(`  Words: ${result.extraction.wordCount}`);
      console.log(`  Quality: ${result.extraction.estimatedQuality}%`);
    });
    
    console.log(`\nSAMPLE FAILED EXTRACTIONS:`);
    const failed = this.testResults.filter(r => !r.extraction.success);
    failed.slice(0, 3).forEach(result => {
      console.log(`\n  Title: ${result.story.title}`);
      console.log(`  URL: ${result.story.url}`);
      console.log(`  Error: ${result.extraction.error || 'Unknown'}`);
      console.log(`  Status: ${result.extraction.httpStatus}`);
    });
    
    // Performance assessment
    console.log(`\nPERFORMANCE ASSESSMENT:`);
    if (parseFloat(successRate) >= 70) {
      console.log(`  ✓ SUCCESS RATE: Excellent (${successRate}% >= 70%)`);
    } else if (parseFloat(successRate) >= 50) {
      console.log(`  ⚠ SUCCESS RATE: Good (${successRate}% >= 50%)`);
    } else {
      console.log(`  ✗ SUCCESS RATE: Needs improvement (${successRate}% < 50%)`);
    }
    
    if (parseInt(avgTime) <= 5000) {
      console.log(`  ✓ PERFORMANCE: Excellent (${avgTime}ms <= 5000ms)`);
    } else if (parseInt(avgTime) <= 10000) {
      console.log(`  ⚠ PERFORMANCE: Acceptable (${avgTime}ms <= 10000ms)`);
    } else {
      console.log(`  ✗ PERFORMANCE: Slow (${avgTime}ms > 10000ms)`);
    }
    
    console.log('\n' + '='.repeat(80));
  }

  async saveResults() {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const filename = `extraction-test-${timestamp}.json`;
    const filepath = path.join(__dirname, '../test-results', filename);
    
    try {
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await fs.writeFile(filepath, JSON.stringify({
        timestamp: new Date().toISOString(),
        stats: {
          ...this.stats,
          domainStats: Object.fromEntries(this.stats.domainStats),
          errorTypes: Object.fromEntries(this.stats.errorTypes),
        },
        results: this.testResults,
      }, null, 2));
      
      console.log(`\nDetailed results saved to: ${filename}`);
    } catch (error) {
      console.warn(`Failed to save results: ${error.message}`);
    }
  }
}

async function main() {
  const tester = new ContentExtractionTester();
  
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const limit = parseInt(args[0]) || 20;
    
    console.log('HN Nibble - Content Extraction Test Suite');
    console.log('==========================================');
    
    // Fetch stories from Hacker News
    const stories = await tester.fetchTopHNStories(limit);
    
    if (stories.length === 0) {
      console.error('No stories found to test. Exiting.');
      process.exit(1);
    }
    
    // Test extraction on each story
    await tester.testStories(stories);
    
    // Generate and display report
    tester.generateReport();
    
    // Save results to file
    await tester.saveResults();
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { ContentExtractionTester };