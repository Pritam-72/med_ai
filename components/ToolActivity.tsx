
import React from 'react';
import { ToolCallEntry } from '../types';

interface ToolActivityProps {
  activities: ToolCallEntry[];
}

const ToolActivity: React.FC<ToolActivityProps> = ({ activities }) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center space-x-2">
        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Medical Engine</h3>
      </div>

      <div className="p-4 space-y-3">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Clinical tools will activate when needed.</p>
        ) : (
          activities.map((tool) => (
            <div key={tool.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 bg-gray-50/50 dark:bg-gray-800/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-lg uppercase">
                  {tool.name.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{tool.id}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">Parameters</p>
                  <pre className="text-[11px] bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-100 dark:border-gray-800 overflow-x-auto font-mono text-gray-600 dark:text-gray-400">
                    {JSON.stringify(tool.args, null, 2)}
                  </pre>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">Output</p>
                  {tool.result ? (
                    <div className="text-[11px] bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/30 font-medium text-emerald-700 dark:text-emerald-400 h-full">
                      {typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result)}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-[11px] text-gray-400 dark:text-gray-500 h-full">
                      <div className="w-3 h-3 border-2 border-gray-200 dark:border-gray-700 border-t-blue-400 rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ToolActivity;
