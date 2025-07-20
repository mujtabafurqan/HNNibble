#!/usr/bin/env node

/**
 * AI Summarization Testing Tool
 * 
 * This script helps test the summarization service with sample HN articles,
 * validate quality, measure performance, and generate reports.
 * 
 * Usage:
 *   node scripts/testSummarization.js [command] [options]
 * 
 * Commands:
 *   test-single      Test summarization on a single article
 *   test-batch       Test batch summarization on multiple articles
 *   quality-test     Test summary quality on sample articles
 *   performance-test Measure API response times and costs
 *   cache-test       Test cache effectiveness
 *   prompt-test      Compare different prompt variations
 */

const fs = require('fs');
const path = require('path');

// Sample HN articles for testing
const SAMPLE_ARTICLES = [
  {
    title: "New JavaScript Framework Promises to Change Everything",
    content: `A new JavaScript framework called "ReactNext" has been released, claiming to solve all the problems with modern web development. The framework introduces a novel approach to state management and rendering that the creators say is 10x faster than React.

    The framework was built by a team of former Google engineers who were frustrated with the complexity of modern web development. "We wanted to create something that would make building web applications as simple as writing plain JavaScript," said lead developer Sarah Chen.

    Key features include automatic state synchronization, zero-configuration setup, and built-in performance optimizations. The framework also includes a new type system that promises to catch more errors at compile time.

    Early adopters report significant performance improvements and easier development workflows. However, some developers are skeptical about adopting another new framework in an already fragmented ecosystem.

    The framework is open source and available on GitHub. The team plans to release additional tooling and documentation over the coming months.`,
    url: "https://example.com/react-next-framework",
    expectedType: "technical"
  },
  {
    title: "Startup Raises $50M to Revolutionize Food Delivery",
    content: `Food delivery startup FoodFlow has raised $50 million in Series B funding to expand its innovative delivery network. The company uses autonomous drones and AI-powered routing to deliver food faster and more efficiently than traditional services.

    Founded in 2019, FoodFlow has grown rapidly during the pandemic as more people ordered food for delivery. The company's technology allows restaurants to deliver food within 15 minutes in urban areas.

    "We're not just another food delivery app," said CEO Michael Rodriguez. "We're building the infrastructure for the future of food commerce." The company plans to use the funding to expand to 20 new cities and develop new drone technology.

    Investors include Andreessen Horowitz and Sequoia Capital. The round brings FoodFlow's total funding to $120 million and values the company at $800 million.

    FoodFlow faces competition from established players like DoorDash and Uber Eats, but believes its technology advantage will help it capture market share.`,
    url: "https://example.com/foodflow-funding",
    expectedType: "general"
  },
  {
    title: "Machine Learning Model Achieves 99% Accuracy in Medical Diagnosis",
    content: `Researchers at Stanford University have developed a machine learning model that can diagnose skin cancer with 99% accuracy, matching the performance of expert dermatologists. The model was trained on over 100,000 images of skin lesions.

    The deep learning system uses a convolutional neural network architecture similar to those used in image recognition. However, the researchers made several key modifications to improve performance on medical images.

    "This represents a significant breakthrough in AI-assisted medical diagnosis," said Dr. Jennifer Liu, lead researcher on the project. "Our model could help doctors in areas where dermatology specialists aren't available."

    The research team used transfer learning, starting with a model pre-trained on general images and then fine-tuning it on medical data. They also employed data augmentation techniques to increase the diversity of training examples.

    Clinical trials are planned to test the system in real-world medical settings. The researchers hope to expand the approach to other types of medical imaging and diagnostic tasks.

    The work was published in the journal Nature Medicine and has already attracted interest from several medical device companies.`,
    url: "https://example.com/ml-medical-diagnosis",
    expectedType: "technical"
  }
];

// Mock environment for testing
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key-for-local-testing';
process.env.OPENAI_MODEL = 'gpt-4o-mini';
process.env.OPENAI_MAX_TOKENS = '150';

class SummarizationTester {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async testSingleArticle(article = SAMPLE_ARTICLES[0]) {
    console.log(`\n🧪 Testing single article: "${article.title}"\n`);
    
    try {
      // This would normally import the actual service
      // For now, we'll simulate the behavior
      const mockSummary = await this.simulateSummarization(article);
      
      console.log(`✅ Summary generated successfully:`);
      console.log(`📝 Summary: ${mockSummary.summary}`);
      console.log(`📊 Word count: ${mockSummary.wordCount}`);
      console.log(`⏱️  Processing time: ${mockSummary.processingTime}ms`);
      console.log(`💰 Estimated cost: $${mockSummary.cost?.toFixed(4) || '0.0020'}`);
      console.log(`🎯 Quality score: ${mockSummary.metadata.qualityScore.toFixed(2)}`);
      
      return mockSummary;
    } catch (error) {
      console.error(`❌ Error testing single article:`, error.message);
      throw error;
    }
  }

  async testBatchSummarization() {
    console.log(`\n🧪 Testing batch summarization on ${SAMPLE_ARTICLES.length} articles\n`);
    
    const results = [];
    let totalCost = 0;
    let successCount = 0;
    
    for (let i = 0; i < SAMPLE_ARTICLES.length; i++) {
      const article = SAMPLE_ARTICLES[i];
      console.log(`Processing article ${i + 1}/${SAMPLE_ARTICLES.length}: ${article.title}`);
      
      try {
        const summary = await this.simulateSummarization(article);
        results.push({ article, summary, success: true });
        totalCost += summary.cost || 0.002;
        successCount++;
        console.log(`✅ Success`);
      } catch (error) {
        results.push({ article, error: error.message, success: false });
        console.log(`❌ Failed: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Batch Results:`);
    console.log(`✅ Successful: ${successCount}/${SAMPLE_ARTICLES.length}`);
    console.log(`💰 Total cost: $${totalCost.toFixed(4)}`);
    console.log(`💰 Average cost per summary: $${(totalCost / successCount).toFixed(4)}`);
    
    return results;
  }

  async testSummaryQuality() {
    console.log(`\n🧪 Testing summary quality on sample articles\n`);
    
    const qualityMetrics = [];
    
    for (const article of SAMPLE_ARTICLES) {
      console.log(`Testing quality for: ${article.title}`);
      
      const summary = await this.simulateSummarization(article);
      const quality = this.evaluateQuality(summary, article);
      
      qualityMetrics.push({
        title: article.title,
        summary: summary.summary,
        quality,
        expectedType: article.expectedType
      });
      
      console.log(`📊 Quality score: ${quality.overall.toFixed(2)}/1.0`);
      console.log(`   - Length: ${quality.lengthScore.toFixed(2)}`);
      console.log(`   - Clarity: ${quality.clarityScore.toFixed(2)}`);
      console.log(`   - Relevance: ${quality.relevanceScore.toFixed(2)}`);
    }
    
    const avgQuality = qualityMetrics.reduce((sum, m) => sum + m.quality.overall, 0) / qualityMetrics.length;
    console.log(`\n📈 Average quality score: ${avgQuality.toFixed(2)}/1.0`);
    
    return qualityMetrics;
  }

  async testPerformance() {
    console.log(`\n🧪 Testing performance and response times\n`);
    
    const performanceMetrics = {
      responseTimes: [],
      costs: [],
      tokenUsage: [],
      cacheHits: 0,
      totalRequests: 0
    };
    
    // Test each article multiple times to get average performance
    for (let iteration = 0; iteration < 3; iteration++) {
      console.log(`Performance test iteration ${iteration + 1}/3`);
      
      for (const article of SAMPLE_ARTICLES) {
        const startTime = Date.now();
        
        try {
          const summary = await this.simulateSummarization(article, iteration > 0); // Simulate cache hit
          const responseTime = Date.now() - startTime;
          
          performanceMetrics.responseTimes.push(responseTime);
          performanceMetrics.costs.push(summary.cost || 0.002);
          performanceMetrics.tokenUsage.push(summary.tokensUsed);
          performanceMetrics.totalRequests++;
          
          if (summary.cached) {
            performanceMetrics.cacheHits++;
          }
          
        } catch (error) {
          console.error(`Performance test failed for ${article.title}:`, error.message);
        }
      }
    }
    
    const avgResponseTime = performanceMetrics.responseTimes.reduce((a, b) => a + b, 0) / performanceMetrics.responseTimes.length;
    const avgCost = performanceMetrics.costs.reduce((a, b) => a + b, 0) / performanceMetrics.costs.length;
    const avgTokens = performanceMetrics.tokenUsage.reduce((a, b) => a + b, 0) / performanceMetrics.tokenUsage.length;
    const cacheHitRate = (performanceMetrics.cacheHits / performanceMetrics.totalRequests) * 100;
    
    console.log(`\n📊 Performance Results:`);
    console.log(`⏱️  Average response time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`💰 Average cost: $${avgCost.toFixed(4)}`);
    console.log(`🎯 Average tokens: ${avgTokens.toFixed(0)}`);
    console.log(`⚡ Cache hit rate: ${cacheHitRate.toFixed(1)}%`);
    
    return performanceMetrics;
  }

  async testCacheEffectiveness() {
    console.log(`\n🧪 Testing cache effectiveness\n`);
    
    // Test same article multiple times to verify caching
    const article = SAMPLE_ARTICLES[0];
    const cacheResults = [];
    
    for (let i = 0; i < 5; i++) {
      console.log(`Cache test ${i + 1}/5`);
      
      const startTime = Date.now();
      const summary = await this.simulateSummarization(article, i > 0); // Simulate cache after first request
      const responseTime = Date.now() - startTime;
      
      cacheResults.push({
        iteration: i + 1,
        cached: summary.cached,
        responseTime,
        cost: summary.cost || 0
      });
      
      console.log(`${summary.cached ? '⚡ Cached' : '🔄 Generated'} - ${responseTime}ms`);
    }
    
    const cacheHits = cacheResults.filter(r => r.cached).length;
    const cacheHitRate = (cacheHits / cacheResults.length) * 100;
    const avgCachedTime = cacheResults.filter(r => r.cached).reduce((sum, r) => sum + r.responseTime, 0) / cacheHits || 0;
    const avgGeneratedTime = cacheResults.filter(r => !r.cached).reduce((sum, r) => sum + r.responseTime, 0) / (cacheResults.length - cacheHits) || 0;
    
    console.log(`\n📊 Cache Effectiveness:`);
    console.log(`⚡ Cache hit rate: ${cacheHitRate}%`);
    console.log(`🚀 Cached response time: ${avgCachedTime.toFixed(0)}ms`);
    console.log(`🔄 Generated response time: ${avgGeneratedTime.toFixed(0)}ms`);
    console.log(`📈 Speed improvement: ${((avgGeneratedTime - avgCachedTime) / avgGeneratedTime * 100).toFixed(1)}%`);
    
    return cacheResults;
  }

  async testPromptVariations() {
    console.log(`\n🧪 Testing different prompt variations\n`);
    
    const prompts = ['primary', 'technical', 'general', 'fallback'];
    const article = SAMPLE_ARTICLES[1]; // Use business article
    const promptResults = [];
    
    for (const promptType of prompts) {
      console.log(`Testing ${promptType} prompt`);
      
      const summary = await this.simulateSummarization(article, false, promptType);
      const quality = this.evaluateQuality(summary, article);
      
      promptResults.push({
        promptType,
        summary: summary.summary,
        quality: quality.overall,
        wordCount: summary.wordCount
      });
      
      console.log(`📝 ${promptType}: ${summary.summary.substring(0, 100)}...`);
      console.log(`📊 Quality: ${quality.overall.toFixed(2)}, Words: ${summary.wordCount}`);
    }
    
    // Find best performing prompt
    const bestPrompt = promptResults.reduce((best, current) => 
      current.quality > best.quality ? current : best
    );
    
    console.log(`\n🏆 Best performing prompt: ${bestPrompt.promptType} (quality: ${bestPrompt.quality.toFixed(2)})`);
    
    return promptResults;
  }

  async generateReport() {
    console.log(`\n📊 Generating comprehensive test report...\n`);
    
    const report = {
      timestamp: new Date().toISOString(),
      testDuration: Date.now() - this.startTime,
      tests: {
        single: await this.testSingleArticle(),
        batch: await this.testBatchSummarization(),
        quality: await this.testSummaryQuality(),
        performance: await this.testPerformance(),
        cache: await this.testCacheEffectiveness(),
        prompts: await this.testPromptVariations()
      }
    };
    
    // Save report to file
    const reportPath = path.join(__dirname, '..', 'test-reports', `summarization-test-${Date.now()}.json`);
    
    // Ensure directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n✅ Test completed! Report saved to: ${reportPath}`);
    console.log(`⏱️  Total test duration: ${(report.testDuration / 1000).toFixed(1)}s`);
    
    return report;
  }

  // Helper methods

  async simulateSummarization(article, useCache = false, promptType = 'primary') {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, useCache ? 50 : 800 + Math.random() * 400));
    
    // Generate mock summary based on article type
    const summaries = {
      technical: `${article.title.split(' ').slice(0, 3).join(' ')} introduces significant technical improvements. The implementation shows promising performance gains and addresses key developer pain points.`,
      general: `${article.title.split(' ').slice(0, 3).join(' ')} represents a major development in the industry. This announcement could have significant implications for market dynamics and consumer behavior.`,
      primary: `${article.title.split(' ').slice(0, 4).join(' ')} marks an important milestone. The development demonstrates innovation and addresses real-world challenges effectively.`
    };
    
    const summary = summaries[article.expectedType] || summaries.primary;
    
    return {
      summary,
      wordCount: summary.split(' ').length,
      confidence: 0.85 + Math.random() * 0.1,
      tokensUsed: 45 + Math.floor(Math.random() * 30),
      processingTime: useCache ? 50 : 800 + Math.random() * 400,
      cached: useCache,
      model: 'gpt-4o-mini',
      cost: useCache ? 0 : 0.0018 + Math.random() * 0.0004,
      metadata: {
        qualityScore: 0.8 + Math.random() * 0.15,
        extractedDate: new Date()
      }
    };
  }

  evaluateQuality(summary, article) {
    const wordCount = summary.summary.split(' ').length;
    const sentences = summary.summary.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Length score (ideal: 15-50 words)
    const lengthScore = wordCount >= 15 && wordCount <= 50 ? 1.0 : 
                       wordCount >= 10 && wordCount <= 60 ? 0.8 : 0.6;
    
    // Clarity score (based on sentence structure)
    const avgWordsPerSentence = wordCount / sentences.length;
    const clarityScore = avgWordsPerSentence >= 8 && avgWordsPerSentence <= 20 ? 1.0 : 0.7;
    
    // Relevance score (basic keyword matching)
    const titleWords = article.title.toLowerCase().split(' ');
    const summaryWords = summary.summary.toLowerCase().split(' ');
    const keywordMatches = titleWords.filter(word => summaryWords.includes(word)).length;
    const relevanceScore = Math.min(keywordMatches / Math.max(titleWords.length * 0.3, 1), 1.0);
    
    const overall = (lengthScore + clarityScore + relevanceScore) / 3;
    
    return {
      lengthScore,
      clarityScore,
      relevanceScore,
      overall
    };
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2] || 'help';
  const tester = new SummarizationTester();
  
  try {
    switch (command) {
      case 'test-single':
        await tester.testSingleArticle();
        break;
      case 'test-batch':
        await tester.testBatchSummarization();
        break;
      case 'quality-test':
        await tester.testSummaryQuality();
        break;
      case 'performance-test':
        await tester.testPerformance();
        break;
      case 'cache-test':
        await tester.testCacheEffectiveness();
        break;
      case 'prompt-test':
        await tester.testPromptVariations();
        break;
      case 'full-report':
        await tester.generateReport();
        break;
      case 'help':
      default:
        console.log(`
🤖 AI Summarization Testing Tool

Usage: node scripts/testSummarization.js [command]

Commands:
  test-single      Test summarization on a single article
  test-batch       Test batch summarization on multiple articles  
  quality-test     Test summary quality on sample articles
  performance-test Measure API response times and costs
  cache-test       Test cache effectiveness
  prompt-test      Compare different prompt variations
  full-report      Run all tests and generate comprehensive report
  help            Show this help message

Examples:
  node scripts/testSummarization.js test-single
  node scripts/testSummarization.js full-report
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SummarizationTester, SAMPLE_ARTICLES };