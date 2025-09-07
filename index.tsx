/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';

// Use the correct environment variable for the API key as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const imageUploadInput = document.getElementById('image-upload') as HTMLInputElement;
const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
const retouchButton = document.getElementById('retouch-button') as HTMLButtonElement;
const originalImageGallery = document.getElementById('original-image-gallery');
const retouchedImageGallery = document.getElementById('retouched-image-gallery');
const suggestionsContainer = document.getElementById('prompt-suggestions');
const retouchedCountSpan = document.getElementById('retouched-count') as HTMLSpanElement;
const aspectRatioSelect = document.getElementById('aspect-ratio-select') as HTMLSelectElement;

let uploadedFile: File | null = null;
let uploadedFileMimeType: string | null = null;

// --- Prompt Suggestions ---
const promptSuggestions = [
    // Professional & Business
    "Change background to a professional office setting",
    "Make my outfit a formal business suit and tie",
    "Improve lighting for a professional headshot",
    "Change background to a modern co-working space",
    "Put me on a stage, as if giving a keynote presentation",
    "Give me a more confident, approachable expression",

    // Creative & Artistic
    "Set the background to a minimalist art gallery",
    "Place me in a cozy, rustic library with warm lighting",
    "Change the background to a vibrant, bustling city street at night",
    "Give the photo a futuristic, neon-lit aesthetic",
    "Convert the photo to a classic, high-contrast black and white portrait",
    "Apply a dramatic, cinematic lighting style",

    // Casual & Lifestyle
    "Change my outfit to a stylish turtleneck and blazer",
    "Set the background to a sunlit garden with blooming flowers",
    "Place me in a trendy, urban coffee shop",
    "Give me a smart-casual look with a crisp polo shirt",
    "Change background to a scenic mountain landscape at sunrise",
    "Make my outfit a rugged adventurer's jacket",
];


function populateSuggestions() {
    if (!suggestionsContainer) return;
    suggestionsContainer.innerHTML = '';
    promptSuggestions.forEach(suggestion => {
        const button = document.createElement('button');
        button.textContent = suggestion;
        button.className = 'suggestion-chip';
        button.addEventListener('click', () => {
            promptInput.value = suggestion;
        });
        suggestionsContainer.appendChild(button);
    });
}

// Utility to convert File to Base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]); // Get only the base64 part
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// Handle image upload
imageUploadInput.addEventListener('change', (event) => {
  const files = (event.target as HTMLInputElement).files;
  if (files && files.length > 0 && originalImageGallery) {
    uploadedFile = files[0];
    uploadedFileMimeType = uploadedFile.type;

    // Display the original image
    const reader = new FileReader();
    reader.onload = (e) => {
      originalImageGallery.innerHTML = ''; // Clear placeholder
      const img = new Image();
      img.src = e.target?.result as string;
      img.alt = 'Uploaded image';
      originalImageGallery.appendChild(img);
    };
    reader.readAsDataURL(uploadedFile);

    retouchButton.disabled = false;
  } else {
    uploadedFile = null;
    uploadedFileMimeType = null;
    retouchButton.disabled = true;
  }
});

// Handle the retouching process
retouchButton.addEventListener('click', async () => {
  if (!uploadedFile || !uploadedFileMimeType || !promptInput.value.trim()) {
    alert('Please upload an image and enter a retouching prompt.');
    return;
  }

  retouchButton.disabled = true;
  suggestionsContainer!.childNodes.forEach(child => ((child as HTMLButtonElement).disabled = true));
  retouchedCountSpan.textContent = '';


  // Show loader
  if (retouchedImageGallery) {
    retouchedImageGallery.innerHTML = '<div class="loader"></div>';
  }

  const TOTAL_IMAGES_TO_GENERATE = 4;

  try {
    const base64ImageData = await fileToBase64(uploadedFile);
    const basePrompt = promptInput.value;
    const selectedAspectRatio = aspectRatioSelect.value;

    const imagePart = {
      inlineData: {
        data: base64ImageData,
        mimeType: uploadedFileMimeType,
      },
    };

    // Create and run 4 promises in parallel, with slightly varied prompts
    const promises: Promise<GenerateContentResponse>[] = Array.from({ length: TOTAL_IMAGES_TO_GENERATE }).map((_, index) => {
      const textPart = {
        text: `${basePrompt} (style variation ${index + 1}). IMPORTANT: The output image must have a ${selectedAspectRatio} aspect ratio.`,
      };

      return ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
          parts: [imagePart, textPart],
        },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });
    });
    
    // Use Promise.allSettled to robustly handle responses
    const results = await Promise.allSettled(promises);

    if (retouchedImageGallery) {
        retouchedImageGallery.innerHTML = ''; // Clear loader
        let successfulGenerations = 0;

        results.forEach(result => {
            if (result.status === 'fulfilled') {
                const response = result.value;
                if (response.candidates && response.candidates[0].content.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                            successfulGenerations++;
                            const base64ImageBytes: string = part.inlineData.data;
                            const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                            
                            const container = document.createElement('div');
                            container.className = 'retouched-image-container';
                            // Set the aspect ratio on the container for correct display
                            container.style.aspectRatio = selectedAspectRatio.replace(':', ' / ');

                            const img = new Image();
                            img.src = imageUrl;
                            img.alt = `Retouched: ${promptInput.value}`;
                            
                            const downloadBtn = document.createElement('button');
                            downloadBtn.className = 'download-btn';
                            downloadBtn.innerHTML = '&#x21E3;'; // Downwards arrow
                            downloadBtn.title = 'Download Image';
                            downloadBtn.onclick = () => {
                                const a = document.createElement('a');
                                a.href = imageUrl;
                                a.download = `retouched-${Date.now()}.png`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                            };
                            
                            container.appendChild(img);
                            container.appendChild(downloadBtn);
                            retouchedImageGallery.appendChild(container);
                            break; 
                        }
                    }
                }
            } else {
                console.error("An image generation promise failed:", result.reason);
            }
        });

        retouchedCountSpan.textContent = `(${successfulGenerations}/${TOTAL_IMAGES_TO_GENERATE} succeeded)`;

        if (successfulGenerations === 0) {
            const p = document.createElement('p');
            p.className = 'placeholder-text';
            p.textContent = 'Could not generate any images. The model may have returned only text or an error occurred.';
            retouchedImageGallery!.appendChild(p);
        }
    }

  } catch (error) {
    console.error("Error during image retouching setup:", error);
    if (retouchedImageGallery) {
      retouchedImageGallery.innerHTML = '';
      const p = document.createElement('p');
      p.className = 'placeholder-text';
      p.textContent = 'An error occurred. Please check the console for details.';
      retouchedImageGallery.appendChild(p);
      retouchedCountSpan.textContent = '(failed)';
    }
  } finally {
    retouchButton.disabled = false;
    suggestionsContainer!.childNodes.forEach(child => ((child as HTMLButtonElement).disabled = false));
  }
});

// Initial setup
document.addEventListener('DOMContentLoaded', populateSuggestions);