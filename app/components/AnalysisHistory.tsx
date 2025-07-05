import { useState, useEffect } from 'react';
import { Analysis, AnalysisType, getAnalysesByType } from '@/lib/analysis-storage-service';
import { formatDistanceToNow } from 'date-fns';

type AnalysisHistoryProps = {
  type?: AnalysisType;
  leagueId?: string;
  limit?: number;
};

export default function AnalysisHistory({ 
  type = 'draft_strategy', 
  leagueId,
  limit = 5 
}: AnalysisHistoryProps) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadAnalyses() {
      try {
        setIsLoading(true);
        setError(null);
        
        const results = await getAnalysesByType(type, limit);
        setAnalyses(results);
      } catch (err: any) {
        console.error('Failed to load analyses:', err);
        setError(err.message || 'Failed to load analyses');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadAnalyses();
  }, [type, limit]);
  
  if (isLoading) {
    return <div className="p-4 text-center">Loading analysis history...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }
  
  if (analyses.length === 0) {
    return <div className="p-4 text-gray-500">No previous analyses found.</div>;
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Recent Analyses</h3>
      
      <div className="space-y-3">
        {analyses.map((analysis) => (
          <div key={analysis.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium">{analysis.type.replace(/_/g, ' ')}</h4>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true })}
              </span>
            </div>
            
            <div className="prose prose-sm max-w-none">
              {analysis.content}
            </div>
            
            {analysis.parameters && (
              <div className="mt-3 text-xs text-gray-500">
                {analysis.parameters.position && (
                  <span className="mr-2">Position: {analysis.parameters.position}</span>
                )}
                {analysis.parameters.player_count && (
                  <span>Players: {analysis.parameters.player_count}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 