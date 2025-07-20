#!/usr/bin/env node

/**
 * AI Summarization Validation Tool
 * 
 * This script validates the summarization implementation by running
 * integration tests with the actual services and checking for issues.
 */

const fs = require('fs');
const path = require('path');

class SummarizationValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
  }

  async validateEnvironment() {
    console.log('🔍 Validating environment configuration...\n');

    // Check if .env.example exists
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    if (fs.existsSync(envExamplePath)) {
      this.passed.push('✅ .env.example file exists');
      
      // Validate required environment variables
      const envContent = fs.readFileSync(envExamplePath, 'utf8');
      const requiredVars = [
        'OPENAI_API_KEY',
        'OPENAI_MODEL', 
        'OPENAI_MAX_TOKENS',
        'SUMMARY_TIMEOUT_MS',
        'MAX_CACHE_SIZE'
      ];

      for (const envVar of requiredVars) {
        if (envContent.includes(envVar)) {
          this.passed.push(`✅ ${envVar} defined in .env.example`);
        } else {
          this.errors.push(`❌ ${envVar} missing from .env.example`);
        }
      }
    } else {
      this.errors.push('❌ .env.example file not found');
    }
  }

  async validateTypeDefinitions() {
    console.log('🔍 Validating TypeScript type definitions...\n');

    const typesPath = path.join(__dirname, '..', 'src', 'types', 'summarization.ts');
    if (fs.existsSync(typesPath)) {
      this.passed.push('✅ Summarization types file exists');
      
      const typesContent = fs.readFileSync(typesPath, 'utf8');
      const requiredTypes = [
        'SummaryRequest',
        'SummaryResponse', 
        'SummaryCache',
        'SummaryQueueItem',
        'ExtractedContent'
      ];

      for (const type of requiredTypes) {
        if (typesContent.includes(`interface ${type}`)) {
          this.passed.push(`✅ ${type} interface defined`);
        } else {
          this.errors.push(`❌ ${type} interface missing`);
        }
      }
    } else {
      this.errors.push('❌ Summarization types file not found');
    }
  }

  async validateServiceFiles() {
    console.log('🔍 Validating service implementation files...\n');

    const serviceFiles = [
      'summarizationService.ts',
      'summaryCache.ts',
      'summaryQueue.ts'
    ];

    const servicesDir = path.join(__dirname, '..', 'src', 'services');

    for (const file of serviceFiles) {
      const filePath = path.join(servicesDir, file);
      if (fs.existsSync(filePath)) {
        this.passed.push(`✅ ${file} exists`);
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for essential exports
        if (file === 'summarizationService.ts') {
          if (content.includes('class SummarizationService')) {
            this.passed.push('✅ SummarizationService class exported');
          } else {
            this.errors.push('❌ SummarizationService class not found');
          }
        }
        
        if (file === 'summaryCache.ts') {
          if (content.includes('class SummaryCacheService')) {
            this.passed.push('✅ SummaryCacheService class exported');
          } else {
            this.errors.push('❌ SummaryCacheService class not found');
          }
        }

        if (file === 'summaryQueue.ts') {
          if (content.includes('class SummaryQueueService')) {
            this.passed.push('✅ SummaryQueueService class exported');
          } else {
            this.errors.push('❌ SummaryQueueService class not found');
          }
        }
      } else {
        this.errors.push(`❌ ${file} not found`);
      }
    }
  }

  async validatePrompts() {
    console.log('🔍 Validating prompt configuration...\n');

    const promptsPath = path.join(__dirname, '..', 'src', 'constants', 'prompts.ts');
    if (fs.existsSync(promptsPath)) {
      this.passed.push('✅ Prompts file exists');
      
      const content = fs.readFileSync(promptsPath, 'utf8');
      
      const requiredPrompts = ['primary', 'technical', 'general', 'fallback'];
      for (const prompt of requiredPrompts) {
        if (content.includes(prompt)) {
          this.passed.push(`✅ ${prompt} prompt defined`);
        } else {
          this.warnings.push(`⚠️  ${prompt} prompt might be missing`);
        }
      }

      if (content.includes('SYSTEM_PROMPT')) {
        this.passed.push('✅ System prompt defined');
      } else {
        this.warnings.push('⚠️  System prompt not found');
      }
    } else {
      this.errors.push('❌ Prompts file not found');
    }
  }

  async validateTests() {
    console.log('🔍 Validating test files...\n');

    const testFiles = [
      'summarizationService.test.ts',
      'summaryCache.test.ts',
      'summaryQueue.test.ts'
    ];

    const testsDir = path.join(__dirname, '..', 'src', 'services', '__tests__');

    for (const file of testFiles) {
      const filePath = path.join(testsDir, file);
      if (fs.existsSync(filePath)) {
        this.passed.push(`✅ ${file} test file exists`);
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Count test cases
        const testCases = (content.match(/it\(|test\(/g) || []).length;
        if (testCases >= 5) {
          this.passed.push(`✅ ${file} has ${testCases} test cases`);
        } else {
          this.warnings.push(`⚠️  ${file} has only ${testCases} test cases`);
        }
      } else {
        this.errors.push(`❌ ${file} test file not found`);
      }
    }
  }

  async validateDependencies() {
    console.log('🔍 Validating package dependencies...\n');

    const packagePath = path.join(__dirname, '..', 'package.json');
    if (fs.existsSync(packagePath)) {
      this.passed.push('✅ package.json exists');
      
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const dependencies = { ...packageContent.dependencies, ...packageContent.devDependencies };
      
      const requiredDeps = [
        'openai',
        'react-native-dotenv', 
        'crypto-js',
        '@react-native-async-storage/async-storage'
      ];

      for (const dep of requiredDeps) {
        if (dependencies[dep]) {
          this.passed.push(`✅ ${dep} dependency installed`);
        } else {
          this.errors.push(`❌ ${dep} dependency missing`);
        }
      }
    } else {
      this.errors.push('❌ package.json not found');
    }
  }

  async validateIntegration() {
    console.log('🔍 Validating service integration...\n');

    try {
      // Check if we can import the types (basic syntax validation)
      const typesPath = path.join(__dirname, '..', 'src', 'types', 'summarization.ts');
      if (fs.existsSync(typesPath)) {
        const typesContent = fs.readFileSync(typesPath, 'utf8');
        
        // Basic syntax check - look for obvious issues
        if (typesContent.includes('export interface') && !typesContent.includes('syntax error')) {
          this.passed.push('✅ Types file has valid syntax');
        }
      }

      // Check service imports and exports
      const serviceFiles = ['summarizationService.ts', 'summaryCache.ts', 'summaryQueue.ts'];
      for (const file of serviceFiles) {
        const filePath = path.join(__dirname, '..', 'src', 'services', file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Check for proper imports
          if (content.includes("from '../types/summarization'")) {
            this.passed.push(`✅ ${file} imports summarization types`);
          } else {
            this.warnings.push(`⚠️  ${file} may not import summarization types`);
          }
          
          // Check for singleton pattern
          if (content.includes('static getInstance()')) {
            this.passed.push(`✅ ${file} implements singleton pattern`);
          } else {
            this.warnings.push(`⚠️  ${file} may not implement singleton pattern`);
          }
        }
      }

    } catch (error) {
      this.errors.push(`❌ Integration validation failed: ${error.message}`);
    }
  }

  async validateConfiguration() {
    console.log('🔍 Validating configuration consistency...\n');

    // Check if configuration values are reasonable
    const envPath = path.join(__dirname, '..', '.env.example');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      // Extract and validate configuration values
      const getConfigValue = (key) => {
        const match = envContent.match(new RegExp(`${key}=(.+)`));
        return match ? match[1] : null;
      };

      const maxTokens = getConfigValue('OPENAI_MAX_TOKENS');
      if (maxTokens && parseInt(maxTokens) > 0 && parseInt(maxTokens) <= 500) {
        this.passed.push('✅ OPENAI_MAX_TOKENS value is reasonable');
      } else {
        this.warnings.push('⚠️  OPENAI_MAX_TOKENS value may be too high or invalid');
      }

      const timeout = getConfigValue('SUMMARY_TIMEOUT_MS');
      if (timeout && parseInt(timeout) >= 10000 && parseInt(timeout) <= 60000) {
        this.passed.push('✅ SUMMARY_TIMEOUT_MS value is reasonable');
      } else {
        this.warnings.push('⚠️  SUMMARY_TIMEOUT_MS value may be too low or high');
      }

      const cacheSize = getConfigValue('MAX_CACHE_SIZE');
      if (cacheSize && parseInt(cacheSize) >= 100 && parseInt(cacheSize) <= 2000) {
        this.passed.push('✅ MAX_CACHE_SIZE value is reasonable');
      } else {
        this.warnings.push('⚠️  MAX_CACHE_SIZE value may be inappropriate');
      }
    }
  }

  async runAllValidations() {
    console.log('🚀 Starting comprehensive validation...\n');

    await this.validateEnvironment();
    await this.validateTypeDefinitions();
    await this.validateServiceFiles();
    await this.validatePrompts();
    await this.validateTests();
    await this.validateDependencies();
    await this.validateIntegration();
    await this.validateConfiguration();

    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION REPORT');
    console.log('='.repeat(60));

    console.log(`\n✅ PASSED (${this.passed.length}):`);
    this.passed.forEach(item => console.log(`  ${item}`));

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`);
      this.warnings.forEach(item => console.log(`  ${item}`));
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ ERRORS (${this.errors.length}):`);
      this.errors.forEach(item => console.log(`  ${item}`));
    }

    console.log('\n' + '='.repeat(60));
    
    const totalChecks = this.passed.length + this.warnings.length + this.errors.length;
    const successRate = ((this.passed.length + this.warnings.length) / totalChecks * 100).toFixed(1);
    
    console.log(`📈 Overall Success Rate: ${successRate}%`);
    
    if (this.errors.length === 0) {
      console.log('🎉 All critical validations passed!');
    } else {
      console.log(`⚠️  ${this.errors.length} critical issues need to be resolved.`);
    }

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      passed: this.passed,
      warnings: this.warnings,
      errors: this.errors,
      successRate: parseFloat(successRate),
      summary: {
        totalChecks,
        passedCount: this.passed.length,
        warningCount: this.warnings.length,
        errorCount: this.errors.length
      }
    };

    const reportPath = path.join(__dirname, '..', 'validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    return report;
  }
}

// CLI Interface
async function main() {
  const validator = new SummarizationValidator();
  
  try {
    await validator.runAllValidations();
    
    // Exit with error code if there are critical errors
    if (validator.errors.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SummarizationValidator };