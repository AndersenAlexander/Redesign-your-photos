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
const negativePromptInput = document.getElementById('negative-prompt-input') as HTMLTextAreaElement;
const retouchButton = document.getElementById('retouch-button') as HTMLButtonElement;
const enhanceColorsButton = document.getElementById('enhance-colors-button') as HTMLButtonElement;
const magicEditButton = document.getElementById('magic-edit-button') as HTMLButtonElement;
const originalImageGallery = document.getElementById('original-image-gallery');
const retouchedImageGallery = document.getElementById('retouched-image-gallery');
const suggestionsContainer = document.getElementById('prompt-suggestions');
const retouchedCountSpan = document.getElementById('retouched-count') as HTMLSpanElement;
const aspectRatioSelect = document.getElementById('aspect-ratio-select') as HTMLSelectElement;
const historyList = document.getElementById('history-list') as HTMLUListElement;
const clearHistoryButton = document.getElementById('clear-history-button') as HTMLButtonElement;
const themeToggleButton = document.getElementById('theme-toggle') as HTMLButtonElement;
const filterButtons = document.querySelectorAll('#filter-controls .filter-btn[data-filter]');
const resetFiltersButton = document.getElementById('reset-filters') as HTMLButtonElement;
const mainElement = document.querySelector('main') as HTMLElement;
const originalHeader = document.getElementById('original-header') as HTMLElement;

// Masking elements
const maskCanvas = document.getElementById('mask-canvas') as HTMLCanvasElement;
const maskCtx = maskCanvas.getContext('2d');
const maskingControls = document.getElementById('masking-controls') as HTMLDivElement;
const brushSizeSlider = document.getElementById('brush-size') as HTMLInputElement;
const maskDoneButton = document.getElementById('mask-done') as HTMLButtonElement;
const maskClearButton = document.getElementById('mask-clear') as HTMLButtonElement;
const maskCancelButton = document.getElementById('mask-cancel') as HTMLButtonElement;

let currentOriginalImage: { data: string; mimeType: string; } | null = null;
let currentMaskData: { data: string; mimeType: string; } | null = null;

const activeFilters: { [key: string]: boolean } = {
  grayscale: false,
  sepia: false,
  blur: false,
  sharpen: false,
};

// --- Filter Management ---
function applyCurrentFilters() {
  let filterString = '';
  if (activeFilters.grayscale) filterString += 'grayscale(1) ';
  if (activeFilters.sepia) filterString += 'sepia(1) ';
  if (activeFilters.blur) filterString += 'blur(3px) ';
  if (activeFilters.sharpen) filterString += 'contrast(1.4) ';
  filterString = filterString.trim();

  const images = retouchedImageGallery?.querySelectorAll('.retouched-image-container img');
  images?.forEach(img => {
    (img as HTMLImageElement).style.filter = filterString;
  });

  filterButtons.forEach(button => {
    const filterName = (button as HTMLElement).dataset.filter;
    if (filterName) {
      if (activeFilters[filterName]) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    }
  });
}

function resetFilters() {
  for (const key in activeFilters) {
    activeFilters[key] = false;
  }
  applyCurrentFilters();
}

// --- Theme Management ---
const THEME_KEY = 'themePreference';

function applyTheme(theme: 'light' | 'dark') {
    if (theme === 'light') {
        document.body.classList.add('light-mode');
        themeToggleButton.textContent = '🌙'; // Moon icon to switch to dark mode
    } else {
        document.body.classList.remove('light-mode');
        themeToggleButton.textContent = '☀️'; // Sun icon to switch to light mode
    }
}

function saveTheme(theme: 'light' | 'dark') {
    localStorage.setItem(THEME_KEY, theme);
}

function loadTheme() {
    let theme: 'light' | 'dark' = 'dark'; // Default to dark theme
    const savedTheme = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
    
    if (savedTheme) {
        theme = savedTheme;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        theme = 'light'; // Respect OS preference if no theme is saved
    }

    applyTheme(theme);
}

themeToggleButton.addEventListener('click', () => {
    const isLight = document.body.classList.contains('light-mode');
    const newTheme = isLight ? 'dark' : 'light';
    applyTheme(newTheme);
    saveTheme(newTheme);
});


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

function clearMaskState() {
    currentMaskData = null;
    originalHeader.classList.remove('mask-active-indicator');
    if (maskCtx) {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
}

// Handle image upload
imageUploadInput.addEventListener('change', async (event) => {
  const files = (event.target as HTMLInputElement).files;
  if (files && files.length > 0 && originalImageGallery && retouchedImageGallery) {
    const file = files[0];

    // Clear previous state when a new image is uploaded
    originalImageGallery.innerHTML = '<p class="placeholder-text">Upload an image to see it here</p>';
    const placeholder = originalImageGallery.querySelector('.placeholder-text');
    if (placeholder) originalImageGallery.removeChild(placeholder);

    retouchedImageGallery.innerHTML = '<p class="placeholder-text">Your retouched images will appear here</p>';
    retouchedCountSpan.textContent = '';
    activeHistoryId = null;
    resetFilters();
    clearMaskState();
    renderHistory(); // Deselect active history item visually

    // Read and display the image
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.alt = 'Uploaded image';
      originalImageGallery.appendChild(img);
    };
    reader.readAsDataURL(file);

    try {
        const base64 = await fileToBase64(file);
        currentOriginalImage = { data: base64, mimeType: file.type };
        retouchButton.disabled = false;
        enhanceColorsButton.disabled = false;
        magicEditButton.disabled = false;
    } catch(e) {
        console.error("Error processing file:", e);
        alert("There was an error processing your image.");
        currentOriginalImage = null;
        retouchButton.disabled = true;
        enhanceColorsButton.disabled = true;
        magicEditButton.disabled = true;
    }

  } else {
    currentOriginalImage = null;
    retouchButton.disabled = true;
    enhanceColorsButton.disabled = true;
    magicEditButton.disabled = true;
  }
});


// --- History Management ---
const HISTORY_KEY = 'imageRetouchHistory';

interface HistoryItem {
  id: string; // Using timestamp as a string
  prompt: string;
  negativePrompt?: string;
  originalImage: { data: string; mimeType: string; };
  retouchedImages: { data: string; mimeType: string; }[];
  aspectRatio: string;
}

let history: HistoryItem[] = [];
let activeHistoryId: string | null = null;

function saveHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save history to localStorage:", e);
    alert("Could not save history. Your browser's local storage might be full.");
  }
}

function loadHistory() {
  try {
    const storedHistory = localStorage.getItem(HISTORY_KEY);
    if (storedHistory) {
      history = JSON.parse(storedHistory);
      renderHistory();
    }
  } catch(e) {
    console.error("Failed to load or parse history from localStorage:", e);
    // If data is corrupted, clear it
    localStorage.removeItem(HISTORY_KEY);
  }
  updateClearHistoryButton();
}

function addHistoryItem(item: Omit<HistoryItem, 'id'>) {
  const newItem: HistoryItem = { ...item, id: Date.now().toString() };
  history.unshift(newItem); // Add to the beginning
  activeHistoryId = newItem.id;
  saveHistory();
  renderHistory();
  updateClearHistoryButton();
}

function restoreFromHistory(id: string) {
  const item = history.find(h => h.id === id);
  if (!item) return;

  resetFilters();
  clearMaskState();

  activeHistoryId = id;
  currentOriginalImage = item.originalImage;

  // Restore original image display
  if (originalImageGallery) {
    originalImageGallery.innerHTML = '';
    const img = new Image();
    img.src = `data:${item.originalImage.mimeType};base64,${item.originalImage.data}`;
    img.alt = 'Original image from history';
    originalImageGallery.appendChild(img);
  }

  // Restore retouched gallery display
  renderRetouchedGallery(item.retouchedImages, item.aspectRatio, item.prompt);
  retouchedCountSpan.textContent = `(${item.retouchedImages.length} images)`;

  // Restore controls state
  promptInput.value = item.prompt;
  negativePromptInput.value = item.negativePrompt || '';
  aspectRatioSelect.value = item.aspectRatio;
  
  // Enable action buttons
  retouchButton.disabled = false;
  enhanceColorsButton.disabled = false;
  magicEditButton.disabled = false;
  
  // Rerender history list to show the active state
  renderHistory();
}

function renderHistory() {
  if (!historyList) return;
  historyList.innerHTML = '';

  if (history.length === 0) {
    const li = document.createElement('li');
    li.className = 'placeholder-text';
    li.textContent = 'Your retouching history will appear here.';
    historyList.appendChild(li);
    return;
  }

  history.forEach(item => {
    const li = document.createElement('li');
    li.className = 'history-item';
    if (item.id === activeHistoryId) {
      li.classList.add('active');
    }
    li.setAttribute('data-id', item.id);
    li.addEventListener('click', () => restoreFromHistory(item.id));

    const thumbnail = new Image();
    thumbnail.className = 'thumbnail';
    // Use the first retouched image as a thumbnail
    if (item.retouchedImages.length > 0) {
      thumbnail.src = `data:${item.retouchedImages[0].mimeType};base64,${item.retouchedImages[0].data}`;
    }
    thumbnail.alt = `Thumbnail for prompt: ${item.prompt}`;

    const details = document.createElement('div');
    details.className = 'history-item-details';
    
    const promptP = document.createElement('p');
    promptP.className = 'history-item-prompt';
    promptP.textContent = item.prompt;
    promptP.title = item.prompt;

    const dateP = document.createElement('p');
    dateP.className = 'history-item-date';
    dateP.textContent = new Date(parseInt(item.id)).toLocaleString();

    details.appendChild(promptP);
    details.appendChild(dateP);
    li.appendChild(thumbnail);
    li.appendChild(details);
    historyList.appendChild(li);
  });
}

function clearHistory() {
    if (confirm("Are you sure you want to clear your entire retouching history? This cannot be undone.")) {
        history = [];
        activeHistoryId = null;
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
        updateClearHistoryButton();
    }
}

function updateClearHistoryButton() {
    clearHistoryButton.disabled = history.length === 0;
}

clearHistoryButton.addEventListener('click', clearHistory);


async function shareImage(
    imageUrl: string, 
    mimeType: string, 
    prompt: string, 
    buttonElement: HTMLButtonElement
) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `retouched-${Date.now()}.png`, { type: mimeType });
        const shareData = {
            title: 'Retouched Image',
            text: `Image created with prompt: ${prompt}`,
            files: [file],
        };

        if (navigator.share && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            if (navigator.clipboard && navigator.clipboard.write) {
                await navigator.clipboard.write([ new ClipboardItem({ [blob.type]: blob }) ]);
                const originalText = buttonElement.innerHTML;
                buttonElement.innerHTML = 'Copied!';
                setTimeout(() => { buttonElement.innerHTML = originalText; }, 2000);
            } else {
                alert("Sharing is not supported on your browser. Please download the image instead.");
            }
        }
    } catch (error) {
        console.error('Error sharing image:', error);
        alert('Could not share the image. Please try downloading it.');
    }
}


async function upscaleImage(
    imageToUpscale: { data: string; mimeType: string },
    containerElement: HTMLDivElement
) {
    const overlay = document.createElement('div');
    overlay.className = 'upscale-overlay';
    overlay.innerHTML = '<div class="mini-loader"></div>';
    containerElement.appendChild(overlay);

    const actionButtons = containerElement.querySelectorAll('.image-action-btn') as NodeListOf<HTMLButtonElement>;
    actionButtons.forEach(btn => btn.disabled = true);

    try {
        const upscalePrompt = "Upscale this image to a higher resolution. Enhance the details and sharpness significantly. Do not add, remove, or change any objects or elements in the image's content.";
        const imagePart = { inlineData: { data: imageToUpscale.data, mimeType: imageToUpscale.mimeType } };
        const textPart = { text: upscalePrompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [imagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        let newImage: { data: string; mimeType: string } | null = null;
        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    newImage = { data: part.inlineData.data, mimeType: part.inlineData.mimeType };
                    break;
                }
            }
        }

        if (!newImage) throw new Error("Upscaling failed: The model did not return an image.");

        const imgElement = containerElement.querySelector('img');
        if (imgElement) {
            imgElement.src = `data:${newImage.mimeType};base64,${newImage.data}`;
        }
        
        const activeItem = history.find(item => item.id === activeHistoryId);
        if (activeItem) {
            const imageIndex = activeItem.retouchedImages.findIndex(img => img.data === imageToUpscale.data);
            if (imageIndex !== -1) {
                activeItem.retouchedImages[imageIndex] = newImage;
                saveHistory();
                if(imageIndex === 0) renderHistory();
            }
        }

    } catch (error) {
        console.error("Error upscaling image:", error);
        alert("Sorry, the image could not be upscaled. Please try again.");
    } finally {
        containerElement.removeChild(overlay);
        actionButtons.forEach(btn => btn.disabled = false);
    }
}


function renderRetouchedGallery(images: { data: string; mimeType: string }[], aspectRatio: string, prompt: string) {
    if (!retouchedImageGallery) return;
    retouchedImageGallery.innerHTML = '';

    if (images.length === 0) {
        const p = document.createElement('p');
        p.className = 'placeholder-text';
        p.textContent = 'Could not generate any images. The model may have returned only text or an error occurred.';
        retouchedImageGallery.appendChild(p);
        return;
    }

    images.forEach(image => {
        const container = document.createElement('div');
        container.className = 'retouched-image-container';
        container.style.aspectRatio = aspectRatio.replace(':', ' / ');

        const img = new Image();
        img.src = `data:${image.mimeType};base64,${image.data}`;
        img.alt = `Retouched: ${prompt}`;
        
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'image-actions';

        const upscaleBtn = document.createElement('button');
        upscaleBtn.className = 'image-action-btn';
        upscaleBtn.title = 'Upscale Image';
        upscaleBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707m4.344 0a.5.5 0 0 1 .707 0l4.096 4.096V11.5a.5.5 0 1 1 1 0v3.975a.5.5 0 0 1-.5.5H11.5a.5.5 0 0 1 0-1h2.768l-4.096-4.096a.5.5 0 0 1 0-.707m0-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707m-4.344 0a.5.5 0 0 1-.707 0L1.025 1.732V4.5a.5.5 0 0 1-1 0V.525a.5.5 0 0 1 .5-.5H4.5a.5.5 0 0 1 0 1H1.732l4.096 4.096a.5.5 0 0 1 0 .707"/>
            </svg>`;
        upscaleBtn.onclick = () => upscaleImage(image, container);

        const shareBtn = document.createElement('button');
        shareBtn.className = 'image-action-btn';
        shareBtn.title = 'Share Image';
        shareBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5m-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"/>
            </svg>`;
        shareBtn.onclick = () => shareImage(img.src, image.mimeType, prompt, shareBtn);

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'image-action-btn';
        downloadBtn.title = 'Download Image';
        downloadBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
            </svg>`;
        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = img.src;
            a.download = `retouched-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        
        actionsContainer.appendChild(upscaleBtn);
        actionsContainer.appendChild(shareBtn);
        actionsContainer.appendChild(downloadBtn);
        container.appendChild(img);
        container.appendChild(actionsContainer);
        retouchedImageGallery.appendChild(container);
    });

    applyCurrentFilters();
}


async function generateImages(prompt: string) {
  if (!currentOriginalImage) {
    alert('Please upload an image or select one from your history.');
    return;
  }

  retouchButton.disabled = true;
  enhanceColorsButton.disabled = true;
  magicEditButton.disabled = true;
  suggestionsContainer!.childNodes.forEach(child => ((child as HTMLButtonElement).disabled = true));
  retouchedCountSpan.textContent = '';


  // Show loader
  if (retouchedImageGallery) {
    retouchedImageGallery.innerHTML = '<div class="loader"></div>';
  }

  const isMaskedEdit = currentMaskData !== null;
  const TOTAL_IMAGES_TO_GENERATE = isMaskedEdit ? 1 : 4;
  const negativePromptValue = negativePromptInput.value.trim();

  try {
    const { data: base64ImageData, mimeType } = currentOriginalImage;
    const selectedAspectRatio = aspectRatioSelect.value;

    const imagePart = { inlineData: { data: base64ImageData, mimeType: mimeType } };
    
    let promises: Promise<GenerateContentResponse>[];

    if (isMaskedEdit) {
        const maskPart = { inlineData: { data: currentMaskData.data, mimeType: currentMaskData.mimeType } };
        let finalPrompt = prompt;
        if (negativePromptValue) {
            finalPrompt += `\n\nDO NOT INCLUDE: ${negativePromptValue}`;
        }
        const textPart = { text: finalPrompt };
        
        promises = [ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [imagePart, textPart, maskPart] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        })];
    } else {
        promises = Array.from({ length: TOTAL_IMAGES_TO_GENERATE }).map((_, index) => {
          let finalPrompt = `${prompt} (style variation ${index + 1}). IMPORTANT: The output image must have a ${selectedAspectRatio} aspect ratio.`;
          if (negativePromptValue) {
            finalPrompt += `\n\nDO NOT INCLUDE: ${negativePromptValue}`;
          }
          const textPart = { text: finalPrompt };

          return ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [imagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
          });
        });
    }
    
    const results = await Promise.allSettled(promises);
    const successfullyGeneratedImages: { data: string; mimeType: string }[] = [];

    results.forEach(result => {
        if (result.status === 'fulfilled') {
            const response = result.value;
            if (response.candidates && response.candidates[0].content.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        successfullyGeneratedImages.push({
                            data: part.inlineData.data,
                            mimeType: part.inlineData.mimeType,
                        });
                        break; // Move to the next result
                    }
                }
            }
        } else {
            console.error("An image generation promise failed:", result.reason);
        }
    });

    renderRetouchedGallery(successfullyGeneratedImages, selectedAspectRatio, prompt);
    retouchedCountSpan.textContent = `(${successfullyGeneratedImages.length}/${TOTAL_IMAGES_TO_GENERATE} succeeded)`;

    // Add to history if any images were generated
    if (successfullyGeneratedImages.length > 0) {
      addHistoryItem({
        prompt,
        negativePrompt: negativePromptValue,
        originalImage: currentOriginalImage,
        retouchedImages: successfullyGeneratedImages,
        aspectRatio: selectedAspectRatio,
      });
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
    enhanceColorsButton.disabled = false;
    magicEditButton.disabled = false;
    suggestionsContainer!.childNodes.forEach(child => ((child as HTMLButtonElement).disabled = false));
    clearMaskState(); // Always clear mask after an attempt
  }
}

// Handle the retouching process
retouchButton.addEventListener('click', async () => {
  if (!promptInput.value.trim()) {
    alert('Please enter a retouching prompt.');
    return;
  }
  await generateImages(promptInput.value);
});

// Handle the color enhancement process
enhanceColorsButton.addEventListener('click', async () => {
  const enhancePrompt = "Enhance the colors of this image to be more vibrant and appealing. Improve the contrast and saturation while keeping the overall look natural. Do not add or remove any objects.";
  await generateImages(enhancePrompt);
});


// --- MASKING LOGIC ---
let isDrawing = false;
let lastX = 0;
let lastY = 0;

function startMaskingMode() {
    const originalImg = originalImageGallery?.querySelector('img');
    if (!originalImg || !maskCtx) return;

    // Set canvas dimensions to match the displayed image
    const rect = originalImg.getBoundingClientRect();
    const galleryRect = originalImageGallery.getBoundingClientRect();
    maskCanvas.width = rect.width;
    maskCanvas.height = rect.height;
    maskCanvas.style.top = `${rect.top - galleryRect.top}px`;
    maskCanvas.style.left = `${rect.left - galleryRect.left}px`;

    mainElement.classList.add('masking-active');
    maskingControls.classList.remove('hidden');
    
    maskCtx.lineJoin = 'round';
    maskCtx.lineCap = 'round';
    maskCtx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
}

function exitMaskingMode() {
    mainElement.classList.remove('masking-active');
    maskingControls.classList.add('hidden');
    if (maskCtx) {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
}

function finishMasking() {
    const originalImg = originalImageGallery?.querySelector('img');
    if (!originalImg || !maskCtx) return;

    // Create an off-screen canvas to generate the final black and white mask
    const finalMaskCanvas = document.createElement('canvas');
    finalMaskCanvas.width = originalImg.naturalWidth;
    finalMaskCanvas.height = originalImg.naturalHeight;
    const finalCtx = finalMaskCanvas.getContext('2d');

    if (!finalCtx) return;

    // Fill with white (area to keep)
    finalCtx.fillStyle = 'white';
    finalCtx.fillRect(0, 0, finalMaskCanvas.width, finalMaskCanvas.height);

    // Draw the user's mask in black (area to edit)
    // We need to scale the drawing from the displayed size to the natural image size
    const scaleX = originalImg.naturalWidth / maskCanvas.width;
    const scaleY = originalImg.naturalHeight / maskCanvas.height;
    finalCtx.save();
    finalCtx.scale(scaleX, scaleY);
    finalCtx.drawImage(maskCanvas, 0, 0);
    finalCtx.restore();
    
    // Use globalCompositeOperation to turn the red drawing into a black mask
    finalCtx.globalCompositeOperation = 'source-in';
    finalCtx.fillStyle = 'black';
    finalCtx.fillRect(0, 0, finalMaskCanvas.width, finalMaskCanvas.height);

    const base64Mask = finalMaskCanvas.toDataURL('image/png').split(',')[1];
    currentMaskData = { data: base64Mask, mimeType: 'image/png' };
    
    originalHeader.classList.add('mask-active-indicator');
    exitMaskingMode();
}

function draw(e: MouseEvent | TouchEvent) {
    if (!isDrawing || !maskCtx) return;
    
    e.preventDefault();
    const rect = maskCanvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    maskCtx.lineWidth = Number(brushSizeSlider.value);
    maskCtx.beginPath();
    maskCtx.moveTo(lastX, lastY);
    maskCtx.lineTo(x, y);
    maskCtx.stroke();
    [lastX, lastY] = [x, y];
}

magicEditButton.addEventListener('click', startMaskingMode);
maskDoneButton.addEventListener('click', finishMasking);
maskCancelButton.addEventListener('click', exitMaskingMode);
maskClearButton.addEventListener('click', () => {
    maskCtx?.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
});

maskCanvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const rect = maskCanvas.getBoundingClientRect();
    [lastX, lastY] = [e.clientX - rect.left, e.clientY - rect.top];
});

maskCanvas.addEventListener('mousemove', draw);
maskCanvas.addEventListener('mouseup', () => isDrawing = false);
maskCanvas.addEventListener('mouseleave', () => isDrawing = false);

maskCanvas.addEventListener('touchstart', (e) => {
    isDrawing = true;
    const rect = maskCanvas.getBoundingClientRect();
    [lastX, lastY] = [e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top];
});
maskCanvas.addEventListener('touchmove', draw);
maskCanvas.addEventListener('touchend', () => isDrawing = false);

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  populateSuggestions();
  loadHistory();

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        const filterName = (button as HTMLElement).dataset.filter;
        if (filterName) {
            activeFilters[filterName] = !activeFilters[filterName];
            applyCurrentFilters();
        }
    });
  });
  resetFiltersButton.addEventListener('click', resetFilters);
});