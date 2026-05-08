import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export default function MessageBubble({ role, content, streaming }: Props) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: ({ children, ...props }) => (
                  <pre {...props} className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 overflow-x-auto text-sm">
                    {children}
                  </pre>
                ),
                code: ({ children, className, ...props }) => {
                  const isInline = !className;
                  if (isInline) {
                    return <code {...props} className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">{children}</code>;
                  }
                  return <code {...props} className={className}>{children}</code>;
                },
              }}
            >
              {content}
            </ReactMarkdown>
            {streaming && (
              <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-0.5 align-text-bottom" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
