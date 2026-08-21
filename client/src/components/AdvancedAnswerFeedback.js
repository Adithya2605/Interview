import React from 'react';
import {
  TrendingUp, TrendingDown, Minus, Brain, Target,
  MessageCircle, CheckCircle, AlertCircle, XCircle,
  Lightbulb, Star, Award, BarChart2
} from 'lucide-react';

const AdvancedAnswerFeedback = ({ feedback }) => {
  if (!feedback || !feedback.advancedAnalysis) return null;

  const { advancedAnalysis } = feedback;
  const { sentiment, keywords, clarity, suitability, overall_score, recommendations } = advancedAnalysis;

  const sentimentMap = {
    'Very Positive': { icon: TrendingUp,   color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    'Positive':      { icon: TrendingUp,   color: 'text-green-600',   bg: 'bg-green-50 border-green-200'   },
    'Neutral':       { icon: Minus,        color: 'text-amber-500',   bg: 'bg-amber-50 border-amber-200'   },
    'Negative':      { icon: TrendingDown, color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-200' },
    'Very Negative': { icon: TrendingDown, color: 'text-red-600',     bg: 'bg-red-50 border-red-200'       },
  };

  const sentimentDisplay = sentimentMap[sentiment?.sentiment] || sentimentMap['Neutral'];
  const SentimentIcon = sentimentDisplay.icon;

  const issuitable = suitability?.prediction === 'Suitable';
  const SuitIcon = issuitable ? CheckCircle : XCircle;

  const scoreColor = (s) => s >= 80 ? 'text-emerald-600' : s >= 50 ? 'text-amber-500' : 'text-red-500';
  const barWidth  = (s) => `${Math.min(100, Math.max(0, s))}%`;

  return (
    <div className="mt-4 rounded-xl border border-blue-100 bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100 bg-white/60">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">NLP Analysis</span>
        </div>
        {overall_score != null && (
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className={`text-sm font-bold ${scoreColor(overall_score)}`}>
              {overall_score.toFixed(0)}<span className="text-xs text-slate-400 font-normal">/100</span>
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* 2×2 Metric Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Sentiment */}
          {sentiment && (
            <div className={`p-3 rounded-lg border ${sentimentDisplay.bg}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <SentimentIcon className={`w-3.5 h-3.5 ${sentimentDisplay.color}`} />
                <span className="text-xs font-medium text-slate-500">Sentiment</span>
              </div>
              <p className={`text-sm font-semibold ${sentimentDisplay.color}`}>{sentiment.sentiment}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {(sentiment.confidence * 100).toFixed(0)}% confident
              </p>
            </div>
          )}

          {/* Keywords */}
          {keywords && (
            <div className="p-3 rounded-lg border bg-violet-50 border-violet-200">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-violet-600" />
                <span className="text-xs font-medium text-slate-500">Keywords</span>
              </div>
              <p className={`text-sm font-semibold ${scoreColor(keywords.coverage_percent || 0)}`}>
                {(keywords.coverage_percent || 0).toFixed(0)}% match
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {keywords.found_keywords?.length || 0} / {keywords.total_keywords || 0} found
              </p>
            </div>
          )}

          {/* Clarity */}
          {clarity && (
            <div className="p-3 rounded-lg border bg-cyan-50 border-cyan-200">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageCircle className="w-3.5 h-3.5 text-cyan-600" />
                <span className="text-xs font-medium text-slate-500">Clarity</span>
              </div>
              <p className={`text-sm font-semibold ${scoreColor((clarity.score || 0) * 10)}`}>
                {clarity.assessment || 'N/A'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {clarity.word_count || 0}w · {clarity.sentence_count || 0} sentences
              </p>
            </div>
          )}

          {/* Suitability */}
          {suitability?.prediction && (
            <div className={`p-3 rounded-lg border ${issuitable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <SuitIcon className={`w-3.5 h-3.5 ${issuitable ? 'text-green-600' : 'text-red-500'}`} />
                <span className="text-xs font-medium text-slate-500">Suitability</span>
              </div>
              <p className={`text-sm font-semibold ${issuitable ? 'text-green-600' : 'text-red-500'}`}>
                {suitability.prediction}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {((suitability.confidence || 0) * 100).toFixed(0)}% confidence
              </p>
            </div>
          )}
        </div>

        {/* Keyword progress bar */}
        {keywords && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Keyword Coverage</span>
              <span>{(keywords.coverage_percent || 0).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: barWidth(keywords.coverage_percent || 0) }}
              />
            </div>
            {/* Found keywords */}
            {keywords.found_keywords?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {keywords.found_keywords.slice(0, 6).map((kw, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                    {kw}
                  </span>
                ))}
                {keywords.found_keywords.length > 6 && (
                  <span className="text-xs text-slate-400 self-center">+{keywords.found_keywords.length - 6} more</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {recommendations?.length > 0 && (
          <div className="rounded-lg bg-white border border-amber-100 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-slate-600">Suggestions</span>
            </div>
            <ul className="space-y-1.5">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <Award className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedAnswerFeedback;
