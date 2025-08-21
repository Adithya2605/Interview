import React from 'react';
import { 
  TrendingUp, TrendingDown, Minus, Brain, Target, 
  MessageCircle, CheckCircle, AlertCircle, XCircle,
  BarChart3, Lightbulb, Star, Award
} from 'lucide-react';

const AdvancedAnswerFeedback = ({ feedback }) => {
  if (!feedback || !feedback.advancedAnalysis) {
    return null;
  }

  const { advancedAnalysis } = feedback;
  const { sentiment, keywords, clarity, suitability, overall_score, recommendations } = advancedAnalysis;

  // Helper function to get sentiment icon and color
  const getSentimentDisplay = (sentimentData) => {
    if (!sentimentData || !sentimentData.sentiment) return null;
    
    const sentimentMap = {
      'Very Positive': { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
      'Positive': { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
      'Neutral': { icon: Minus, color: 'text-yellow-500', bg: 'bg-yellow-50' },
      'Negative': { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
      'Very Negative': { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100' }
    };
    
    return sentimentMap[sentimentData.sentiment] || sentimentMap['Neutral'];
  };

  // Helper function to get score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper function to get suitability display
  const getSuitabilityDisplay = (suitabilityData) => {
    if (!suitabilityData || !suitabilityData.prediction) return null;
    
    const isPositive = suitabilityData.prediction === 'Suitable';
    return {
      icon: isPositive ? CheckCircle : XCircle,
      color: isPositive ? 'text-green-600' : 'text-red-600',
      bg: isPositive ? 'bg-green-100' : 'bg-red-100'
    };
  };

  const sentimentDisplay = getSentimentDisplay(sentiment);
  const suitabilityDisplay = getSuitabilityDisplay(suitability);

  return (
    <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-blue-900">Advanced AI Analysis</h3>
        <div className="ml-auto flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className={`font-bold text-lg ${getScoreColor(overall_score)}`}>
            {overall_score ? `${overall_score.toFixed(1)}/100` : 'N/A'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Sentiment Analysis */}
        {sentimentDisplay && (
          <div className={`p-4 rounded-lg ${sentimentDisplay.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <sentimentDisplay.icon className={`w-4 h-4 ${sentimentDisplay.color}`} />
              <span className="font-medium text-gray-700">Sentiment</span>
            </div>
            <div className={`text-sm font-semibold ${sentimentDisplay.color}`}>
              {sentiment.sentiment}
            </div>
            {sentiment.confidence && (
              <div className="text-xs text-gray-600 mt-1">
                Confidence: {(sentiment.confidence * 100).toFixed(1)}%
              </div>
            )}
          </div>
        )}

        {/* Keyword Coverage */}
        {keywords && (
          <div className="p-4 rounded-lg bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-gray-700">Keywords</span>
            </div>
            <div className={`text-sm font-semibold ${getScoreColor(keywords.coverage_percent || 0)}`}>
              {keywords.coverage_percent ? `${keywords.coverage_percent}%` : '0%'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {keywords.found_keywords?.length || 0} of {keywords.total_keywords || 0} found
            </div>
          </div>
        )}

        {/* Clarity Score */}
        {clarity && (
          <div className="p-4 rounded-lg bg-cyan-50">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-cyan-600" />
              <span className="font-medium text-gray-700">Clarity</span>
            </div>
            <div className={`text-sm font-semibold ${getScoreColor((clarity.score || 0) * 10)}`}>
              {clarity.assessment || 'N/A'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {clarity.word_count || 0} words, {clarity.sentence_count || 0} sentences
            </div>
          </div>
        )}

        {/* Suitability Prediction */}
        {suitabilityDisplay && (
          <div className={`p-4 rounded-lg ${suitabilityDisplay.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <suitabilityDisplay.icon className={`w-4 h-4 ${suitabilityDisplay.color}`} />
              <span className="font-medium text-gray-700">Suitability</span>
            </div>
            <div className={`text-sm font-semibold ${suitabilityDisplay.color}`}>
              {suitability.prediction}
            </div>
            {suitability.confidence && (
              <div className="text-xs text-gray-600 mt-1">
                Confidence: {(suitability.confidence * 100).toFixed(1)}%
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyword Details */}
      {keywords && keywords.found_keywords && keywords.found_keywords.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-green-600" />
            <span className="font-medium text-gray-700">Found Keywords</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywords.found_keywords.map((keyword, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing Keywords */}
      {keywords && keywords.missing_keywords && keywords.missing_keywords.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <span className="font-medium text-gray-700">Suggested Keywords</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywords.missing_keywords.slice(0, 8).map((keyword, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-yellow-600" />
            <span className="font-medium text-gray-700">AI Recommendations</span>
          </div>
          <ul className="space-y-2">
            {recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-2">
                <Award className="w-3 h-3 text-blue-500 mt-1 flex-shrink-0" />
                <span className="text-sm text-gray-700">{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Enhanced Suggestions */}
      {feedback.enhancedSuggestions && feedback.enhancedSuggestions.length > 0 && (
        <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-indigo-600" />
            <span className="font-medium text-gray-700">Combined AI Insights</span>
          </div>
          <div className="space-y-2">
            {feedback.enhancedSuggestions.map((suggestion, index) => (
              <div key={index} className="text-sm text-gray-700 bg-white p-2 rounded border-l-4 border-indigo-400">
                {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedAnswerFeedback;
