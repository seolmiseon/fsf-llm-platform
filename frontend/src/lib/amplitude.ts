import * as amplitude from '@amplitude/analytics-browser';

// Amplitude 초기화
export const initAmplitude = () => {
  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  
  if (!apiKey) {
    console.warn('Amplitude API Key not found');
    return;
  }

  amplitude.init(apiKey, {
    defaultTracking: {
      sessions: true,
      pageViews: true,
      formInteractions: false,
      fileDownloads: false,
    },
  });
};

// 이벤트 트래킹 함수들
export const trackPageView = (pageName: string) => {
  amplitude.track('page_view', {
    page_name: pageName,
    timestamp: new Date().toISOString(),
  });
};

export const trackLLMRequest = (data: {
  question_type: string;
  response_time_ms: number;
  cache_hit: boolean;
  error?: string;
  tools_used?: string[];
  tokens_used?: number;
}) => {
  amplitude.track('llm_request', data);
};

export const trackUserAction = (action: string, details?: Record<string, any>) => {
  amplitude.track('user_action', {
    action,
    ...details,
  });
};

export const trackError = (error: string, context?: Record<string, any>) => {
  amplitude.track('error', {
    error_message: error,
    ...context,
  });
};

export { amplitude };