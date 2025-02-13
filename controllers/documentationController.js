// controllers/documentationController.js
const documentationController = {
    renderDocumentation: (req, res) => {
        res.render('documentation/index', {
            user: req.session.user,
            sections: documentationSections
        });
    },

    searchDocs: (req, res) => {
        const query = req.query.q;
        const results = searchDocumentation(query, documentationSections);
        res.json(results);
    }
};

// Sample documentation data structure
const documentationSections = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: 'rocket',
        sections: [
            {
                id: 'introduction',
                title: 'Introduction',
                content: `
                    <p>Welcome to KreatorAI documentation. This guide will help you understand how to use our AI-powered tools to enhance your content creation workflow.</p>
                    <div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
                        <p class="text-blue-700">Before you begin, make sure you have:</p>
                        <ul class="list-disc ml-4 mt-2">
                            <li>Created an account on KreatorAI</li>
                            <li>Subscribed to one of our plans</li>
                            <li>Basic understanding of content creation</li>
                        </ul>
                    </div>
                `
            }
        ]
    },
    {
        id: 'image-tools',
        title: 'Image Tools',
        icon: 'image',
        sections: [
            {
                id: 'image-generator',
                title: 'Image Generator',
                content: `
                    <div class="space-y-6">
                        <h4 class="text-xl font-semibold">Overview</h4>
                        <p>The Image Generator is an AI-powered tool that creates high-quality images from text descriptions. Perfect for social media, marketing materials, and creative projects.</p>

                        <div class="bg-gray-50 p-6 rounded-lg border border-gray-200 my-6">
                            <h5 class="font-semibold mb-4">Features:</h5>
                            <ul class="space-y-2">
                                <li class="flex items-start">
                                    <svg class="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                    <span>Generate images in multiple sizes (256x256, 512x512, 1024x1024)</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                    <span>Support for various styles and artistic directions</span>
                                </li>
                                <li class="flex items-start">
                                    <svg class="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                    <span>Download in multiple formats (PNG, JPG)</span>
                                </li>
                            </ul>
                        </div>

                        <h4 class="text-xl font-semibold">How to Use</h4>
                        <div class="space-y-4">
                            <div class="bg-white shadow rounded-lg overflow-hidden">
                                <div class="px-4 py-5 sm:p-6">
                                    <h5 class="text-lg font-medium mb-4">Step 1: Create Your Prompt</h5>
                                    <div class="bg-gray-50 p-4 rounded-md">
                                        <code class="text-sm">
                            A serene mountain landscape at sunset with a lake reflection, realistic style, dramatic lighting
                                        </code>
                                    </div>
                                    <p class="mt-3 text-sm text-gray-600">Be specific with details like style, lighting, and composition.</p>
                                </div>
                            </div>

                            <div class="bg-white shadow rounded-lg overflow-hidden">
                                <div class="px-4 py-5 sm:p-6">
                                    <h5 class="text-lg font-medium mb-4">Step 2: Choose Image Settings</h5>
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div class="border rounded-lg p-4 text-center">
                                            <p class="font-medium">256x256</p>
                                            <p class="text-sm text-gray-500">Quick previews</p>
                                        </div>
                                        <div class="border rounded-lg p-4 text-center bg-blue-50 border-blue-200">
                                            <p class="font-medium">512x512</p>
                                            <p class="text-sm text-gray-500">Standard quality</p>
                                        </div>
                                        <div class="border rounded-lg p-4 text-center">
                                            <p class="font-medium">1024x1024</p>
                                            <p class="text-sm text-gray-500">High quality</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h4 class="text-xl font-semibold">Best Practices</h4>
                        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                            <h5 class="font-medium text-yellow-800">Tips for Better Results:</h5>
                            <ul class="mt-2 space-y-2 text-yellow-700">
                                <li>• Use descriptive and specific language</li>
                                <li>• Include style references (e.g., "realistic", "cartoon", "oil painting")</li>
                                <li>• Specify lighting and atmosphere</li>
                                <li>• Mention composition details</li>
                            </ul>
                        </div>

                        <h4 class="text-xl font-semibold">Example Prompts</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-white p-4 rounded-lg border">
                                <h6 class="font-medium mb-2">Product Photography</h6>
                                <p class="text-sm text-gray-600">"Modern coffee cup on wooden table, morning sunlight, professional product photography style, 4k"</p>
                            </div>
                            <div class="bg-white p-4 rounded-lg border">
                                <h6 class="font-medium mb-2">Social Media Post</h6>
                                <p class="text-sm text-gray-600">"Minimalist workspace with laptop and coffee, top view, soft pastel colors, Instagram style"</p>
                            </div>
                        </div>

                        <h4 class="text-xl font-semibold">Limitations</h4>
                        <div class="bg-red-50 p-4 rounded-lg">
                            <ul class="space-y-2 text-red-700">
                                <li>• Maximum of 50 images per day per user</li>
                                <li>• Text and logos may not be accurately generated</li>
                                <li>• Complex scenes might require multiple attempts</li>
                            </ul>
                        </div>

                        <h4 class="text-xl font-semibold">Pricing</h4>
                        <div class="bg-white rounded-lg border overflow-hidden">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images/Month</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Resolution</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap">Basic</td>
                                        <td class="px-6 py-4 whitespace-nowrap">100</td>
                                        <td class="px-6 py-4 whitespace-nowrap">512x512</td>
                                    </tr>
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap">Pro</td>
                                        <td class="px-6 py-4 whitespace-nowrap">500</td>
                                        <td class="px-6 py-4 whitespace-nowrap">1024x1024</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `
            },
            {
                id: 'image-caption',
                title: 'Image Caption Generator',
                content: `
                    <div class="space-y-6">
                        <h4 class="text-xl font-semibold">Overview</h4>
                        <p>The Image Caption Generator creates engaging captions for your images using AI. It analyzes the content and context of your images to generate relevant, engaging captions perfect for social media.</p>

                        <div class="bg-white shadow rounded-lg overflow-hidden">
                            <div class="px-4 py-5 sm:p-6">
                                <h5 class="text-lg font-medium mb-4">Features</h5>
                                <ul class="space-y-3">
                                    <li class="flex items-start">
                                        <svg class="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                        </svg>
                                        <span>Multiple caption styles (Informative, Creative, Engaging)</span>
                                    </li>
                                    <li class="flex items-start">
                                        <svg class="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                        </svg>
                                        <span>Hashtag suggestions</span>
                                    </li>
                                    <li class="flex items-start">
                                        <svg class="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                        </svg>
                                        <span>Emoji integration</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <h4 class="text-xl font-semibold">Supported Formats</h4>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="bg-gray-50 p-4 rounded-lg text-center">
                                <p class="font-medium">JPEG</p>
                            </div>
                            <div class="bg-gray-50 p-4 rounded-lg text-center">
                                <p class="font-medium">PNG</p>
                            </div>
                            <div class="bg-gray-50 p-4 rounded-lg text-center">
                                <p class="font-medium">WebP</p>
                            </div>
                            <div class="bg-gray-50 p-4 rounded-lg text-center">
                                <p class="font-medium">GIF</p>
                            </div>
                        </div>

                        <h4 class="text-xl font-semibold">Caption Styles</h4>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="bg-white p-4 rounded-lg border">
                                <h6 class="font-medium mb-2">Professional</h6>
                                <p class="text-sm text-gray-600">Formal and informative captions suitable for business profiles</p>
                            </div>
                            <div class="bg-white p-4 rounded-lg border">
                                <h6 class="font-medium mb-2">Casual</h6>
                                <p class="text-sm text-gray-600">Friendly and engaging captions for personal social media</p>
                            </div>
                            <div class="bg-white p-4 rounded-lg border">
                                <h6 class="font-medium mb-2">Creative</h6>
                                <p class="text-sm text-gray-600">Artistic and expressive captions for creative content</p>
                            </div>
                        </div>
                    </div>
                `
            }
        ]
    }
    // More sections can be added here...
];

module.exports = documentationController;