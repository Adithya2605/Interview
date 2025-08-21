# AI Interview App

A comprehensive AI-powered interview preparation application built with React, Node.js, and OpenAI. Upload your resume, select a job role, and get personalized interview questions with intelligent feedback.

## Features

- **Resume Upload**: Support for PDF and TXT files with automatic text extraction
- **Job Role Selection**: Choose from 8+ popular tech and business roles
- **AI-Generated Questions**: Personalized interview questions based on your resume and target role
- **Real-time Feedback**: Get detailed feedback on relevance, clarity, and depth of your answers
- **Session History**: Track your progress with local storage of interview sessions
- **Modern UI**: Beautiful, responsive design with Tailwind CSS

## Tech Stack

### Frontend
- React 18
- Tailwind CSS
- Axios for API calls
- Lucide React for icons
- React Router for navigation

### Backend
- Node.js with Express
- OpenAI API integration
- Multer for file uploads
- PDF-Parse for PDF text extraction
- CORS enabled

## Prerequisites

- Node.js (v16 or higher)
- OpenAI API key
- npm or yarn package manager

## Installation

1. **Clone and navigate to the project**
   ```bash
   cd ai-interview-app
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   cd server
   cp .env.example .env
   ```
   
   Edit the `.env` file and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=5000
   ```

## Running the Application

### Development Mode
Run both frontend and backend concurrently:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend React app on `http://localhost:3000`

### Individual Services
```bash
# Run only backend
npm run server

# Run only frontend
npm run client
```

## Usage

1. **Upload Resume**: Upload your resume in PDF or TXT format
2. **Select Role**: Choose the job role you're interviewing for
3. **Answer Questions**: Respond to AI-generated personalized questions
4. **Get Feedback**: Receive detailed feedback on each answer
5. **Review History**: Check your past sessions and track improvement

## API Endpoints

- `POST /api/upload-resume` - Upload and extract text from resume
- `POST /api/generate-questions` - Generate interview questions
- `POST /api/evaluate-answer` - Get AI feedback on answers
- `GET /api/health` - Health check endpoint

## Project Structure

```
ai-interview-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.js         # Main app component
│   │   └── index.js       # Entry point
│   └── package.json
├── server/                # Express backend
│   ├── index.js          # Server entry point
│   ├── .env.example      # Environment template
│   └── package.json
└── README.md
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `PORT` | Server port (default: 5000) | No |

## Features in Detail

### Resume Processing
- Supports PDF and TXT file formats
- Automatic text extraction using pdf-parse
- File size limit: 5MB
- Secure processing without permanent storage

### AI Integration
- Uses OpenAI GPT-3.5-turbo for question generation
- Intelligent answer evaluation with scoring
- Contextual feedback based on job role and resume content

### Session Management
- Local storage for session history
- Progress tracking and performance analytics
- Export/clear functionality for session data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section below
2. Review API documentation
3. Create an issue on GitHub

## Troubleshooting

### Common Issues

**OpenAI API Errors**
- Ensure your API key is valid and has sufficient credits
- Check that the API key is properly set in the `.env` file

**File Upload Issues**
- Verify file format is PDF or TXT
- Check file size is under 5MB
- Ensure proper file permissions

**Build Errors**
- Run `npm run install-all` to ensure all dependencies are installed
- Clear node_modules and reinstall if needed
- Check Node.js version compatibility

### Development Tips

- Use browser dev tools to monitor network requests
- Check server logs for detailed error messages
- Enable CORS if testing from different domains
- Monitor OpenAI API usage to avoid rate limits
