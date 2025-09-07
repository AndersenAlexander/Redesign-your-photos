<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>



# AI Image Retouching Studio

An advanced, feature-rich web application that leverages the power of the Google Gemini API to perform a wide range of sophisticated image editing tasks. This studio provides a seamless, intuitive interface for everything from simple color enhancements to complex generative fills and style transfers.
![alt text](https://via.placeholder.com/800x450.png?text=App+Screenshot+Here)

(It is highly recommended to replace the placeholder above with a high-quality screenshot or GIF of the application in action.)

## ✨ Core Features
This application is packed with professional-grade features designed to provide maximum creative control and efficiency.

## 🤖 Advanced AI Editing Tools
Prompt-Based Retouching: The core functionality. Simply describe the changes you want, and the AI will generate multiple variations.
Magic Edit (Inpainting): Select a specific area of your image with an interactive brush and apply your prompt only to that region for precise modifications.
Magic Eraser (Object Removal): Draw over any unwanted object, and the AI will intelligently remove it and reconstruct the background seamlessly.
Generative Fill (Outpainting): Expand your image beyond its original borders. Use the resizable frame to define new areas, and the AI will generate new content that naturally extends the scene.
Style Transfer: Apply the complete aesthetic (colors, textures, style) of one image to another. Use a famous painting or any reference image to creatively transform your photos.
One-Click Upscaling: Enhance the resolution and detail of any generated image with a single click.
Batch Processing: Upload multiple images and apply the same prompt or enhancement to all of them in a single run, complete with a progress indicator.


## ⚙️ Workflow & Generation Controls
Negative Prompts: Specify what you don't want in the output for more refined results.
Favorite Prompts: Save, manage, and instantly apply your most-used prompt combinations to speed up your workflow.
Advanced Settings: A collapsible section for power users, featuring:
Temperature Slider: Control the AI's creativity, from predictable to highly experimental.
Seed Input: Use a specific seed for reproducible results, perfect for iterative tweaking.
Aspect Ratio Control: Choose from common aspect ratios (Square, Portrait, Landscape, Widescreen) for your final images.


## 🎨 User Interface & Experience
Interactive Before/After Slider: Directly compare the original and retouched images with a draggable slider.
Persistent History: Every editing session is automatically saved to your browser's local storage. You can browse and restore any previous state, including all images and settings.
Light & Dark Modes: A sleek theme toggle that respects your OS preference and saves your choice.
Client-Side Filters: Apply quick post-processing filters like Grayscale, Sepia, Blur, and Sharpen to the final results.
Modern Animations & Transitions: A fluid and polished interface with subtle animations for a premium user experience.
Non-Blocking Notifications: A "toast" notification system provides elegant, non-intrusive feedback for all actions.
Fully Responsive: The layout adapts beautifully to any screen size, from mobile devices to desktops.

## 🛠️ Technology Stack
Frontend: HTML5, CSS3, TypeScript
AI Engine: Google Gemini API (@google/genai) for all image generation and manipulation tasks.
UI Features:
HTML5 Canvas: Powers the interactive masking for Magic Edit, Magic Eraser, and Generative Fill.
CSS Grid: For a robust and responsive main layout.
Local Storage: Used to persist user data including the editing history, favorite prompts, and theme preference.
Tooling: ES Modules via esm.sh for direct browser imports.


## 🚀 Getting Started
Prerequisites
To run this application, you will need an API key for the Google Gemini API.
How to Use the App
Upload Image(s): Click "Upload Image(s)" to select one or more photos from your device. For single-image features, only the first selected image will be used.
Choose a Tool:
For general edits, type a description in the prompt box.
For targeted edits, use Magic Edit, Magic Eraser, or Generative Fill.
For artistic changes, upload a Style Image.
Refine (Optional): Add a Negative Prompt, adjust the Aspect Ratio, or tweak the Advanced Settings.
Generate: Click the primary "Retouch Image" button or another action button to start the process.
Review & Export: The results will appear in the "Retouched" gallery. You can then Upscale, Compare, Share, or Download them.
Revisit: Your entire session is automatically saved in the History panel.
## 📄 License
This project is licensed under the MIT License. See the LICENSE file for details.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
