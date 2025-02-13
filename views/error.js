<!-- views/error.ejs -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - KreatorAI</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
    <div class="max-w-md w-full space-y-8">
        <!-- Logo -->
        <div class="flex justify-center">
            <div class="text-center">
                <h1 class="text-4xl font-bold">
                    <span class="text-blue-600">KREATOR</span>
                    <span class="text-gray-900">AI</span>
                </h1>
            </div>
        </div>

        <!-- Error Details -->
        <div class="bg-white rounded-lg shadow-lg p-8">
            <div class="text-center">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">
                    <%= error.status === 404 ? 'Page Not Found' : 'Something went wrong' %>
                </h2>
                <p class="text-gray-600 mb-6">
                    <%= error.message || 'An unexpected error occurred. Please try again later.' %>
                </p>

                <% if (process.env.NODE_ENV === 'development' && error.stack) { %>
                    <div class="mt-4 p-4 bg-gray-50 rounded-lg overflow-x-auto">
                        <pre class="text-sm text-gray-700 whitespace-pre-wrap"><%= error.stack %></pre>
                    </div>
                <% } %>

                <div class="mt-8">
                    <a href="/" class="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                        Return Home
                    </a>
                </div>
            </div>
        </div>

        <!-- Help Links -->
        <div class="text-center space-y-2">
            <p class="text-sm text-gray-600">
                Need help? <a href="/contact" class="text-blue-600 hover:text-blue-500">Contact Support</a>
            </p>
            <p class="text-sm text-gray-600">
                Or check our <a href="/documentation" class="text-blue-600 hover:text-blue-500">Documentation</a>
            </p>
        </div>
    </div>
</body>
</html>