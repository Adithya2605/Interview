const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up AI Interview App...\n');

// Function to run commands and handle errors
function runCommand(command, cwd = process.cwd()) {
  try {
    console.log(`Running: ${command}`);
    execSync(command, { cwd, stdio: 'inherit' });
    console.log('✅ Success\n');
  } catch (error) {
    console.error(`❌ Error running: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

// Check if Node.js version is compatible
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 16) {
    console.error('❌ Node.js version 16 or higher is required');
    console.error(`Current version: ${nodeVersion}`);
    process.exit(1);
  }
  
  console.log(`✅ Node.js version ${nodeVersion} is compatible\n`);
}

// Create .env file if it doesn't exist
function createEnvFile() {
  const envPath = path.join(__dirname, 'server', '.env');
  const envExamplePath = path.join(__dirname, 'server', '.env.example');
  
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ Created .env file from template');
      console.log('⚠️  Please edit server/.env and add your OpenAI API key\n');
    }
  } else {
    console.log('✅ .env file already exists\n');
  }
}

// Main setup process
async function setup() {
  try {
    checkNodeVersion();
    
    // Install root dependencies
    console.log('📦 Installing root dependencies...');
    runCommand('npm install');
    
    // Install server dependencies
    console.log('📦 Installing server dependencies...');
    runCommand('npm install', path.join(__dirname, 'server'));
    
    // Install client dependencies
    console.log('📦 Installing client dependencies...');
    runCommand('npm install', path.join(__dirname, 'client'));
    
    // Create .env file
    createEnvFile();
    
    console.log('🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Edit server/.env and add your OpenAI API key');
    console.log('2. Run "npm run dev" to start the application');
    console.log('3. Open http://localhost:3000 in your browser');
    console.log('\n💡 For more information, see README.md');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setup();
